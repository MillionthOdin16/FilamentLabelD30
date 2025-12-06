
import { GoogleGenAI } from "@google/genai";
import { FilamentData } from "../types";

// Define structured output schema for Gemini (inline definition)
const FilamentAnalysisSchema = {
  type: "object" as const,
  properties: {
    brand: {
      type: "string" as const,
      description: "Manufacturer brand name (e.g., 'OVERTURE', 'eSUN', 'Hatchbox')",
      nullable: false
    },
    material: {
      type: "string" as const,
      description: "Material type including any modifiers (e.g., 'ROCK PLA', 'Silk PLA', 'PETG', 'ABS')",
      nullable: false
    },
    colorName: {
      type: "string" as const,
      description: "Color name from label (e.g., 'Mars Red', 'Galaxy Black')",
      nullable: false
    },
    colorHex: {
      type: "string" as const,
      description: "Hex color code with # prefix (e.g., '#D76D3B')",
      nullable: true
    },
    minTemp: {
      type: "number" as const,
      description: "Minimum nozzle temperature in Celsius",
      nullable: false
    },
    maxTemp: {
      type: "number" as const,
      description: "Maximum nozzle temperature in Celsius",
      nullable: false
    },
    bedTempMin: {
      type: "number" as const,
      description: "Minimum bed temperature in Celsius",
      nullable: false
    },
    bedTempMax: {
      type: "number" as const,
      description: "Maximum bed temperature in Celsius",
      nullable: false
    },
    weight: {
      type: "string" as const,
      description: "Filament weight with units (e.g., '1kg', '500g')",
      nullable: true
    },
    diameter: {
      type: "string" as const,
      description: "Filament diameter (e.g., '1.75mm', '2.85mm')",
      nullable: true
    },
    spoolWeight: {
      type: "string" as const,
      description: "Empty spool weight if available (e.g., '147g')",
      nullable: true
    },
    length: {
      type: "string" as const,
      description: "Filament length if available (e.g., '300m', '330m')",
      nullable: true
    },
    features: {
      type: "array" as const,
      description: "Special features or properties listed on label",
      items: {
        type: "string" as const
      },
      nullable: true
    },
    notes: {
      type: "string" as const,
      description: "Important details: abrasiveness, recommended nozzle, texture, special handling, composite materials",
      nullable: true
    },
    hygroscopy: {
      type: "string" as const,
      description: "Moisture sensitivity level",
      enum: ["low", "medium", "high"],
      nullable: false
    },
    confidence: {
      type: "number" as const,
      description: "Confidence score 0-100",
      nullable: false
    }
  },
  required: ["brand", "material", "colorName", "minTemp", "maxTemp", "bedTempMin", "bedTempMax", "hygroscopy", "confidence"]
};

const SYSTEM_INSTRUCTION = `
You are an expert 3D Printing Assistant and Materials Engineer. 
Your task is to accurately identify 3D printer filament specifications from an image of a spool label.

**CRITICAL: You will output structured JSON via responseSchema, BUT you must also provide detailed logging.**

**LOGGING FORMAT:**
1. Every analysis step MUST start with "LOG: " prefix
2. Every bounding box MUST start with "BOX: " prefix  
3. Be verbose and detailed in logs - users want to see your thinking process

Example logs:
LOG: Initializing optical character recognition
LOG: Detected brand: OVERTURE
BOX: Brand [100, 200, 150, 400]
LOG: Detected material: ROCK PLA
LOG: Detected color name: Mars Red
LOG: Color hex code found: #D76D3B
LOG: Detected nozzle temperature range: 190-230°C
LOG: Detected bed temperature range: 50-70°C
LOG: Detected filament diameter: 1.75mm ±0.02mm
LOG: Detected empty spool weight: ~147g
LOG: Detected feature: ROCK-LIKE TEXTURE
LOG: Search results confirm Mars Red hex code and specifications
LOG: Rock PLA is a composite material with marble powder - may require hardened steel nozzle

**ANALYSIS STEPS:**
1. **OCR & Text Extraction:** Read ALL visible text on the label. Log each finding.
2. **Bounding Boxes:** For important text regions (brand, material, temps), output BOX coordinates.
3. **Google Search Validation:** Search for exact product specs. Log findings.
4. **Color Analysis:** Analyze visible filament color. Confirm with search.
5. **Feature Detection:** List all special features mentioned (texture, ease of printing, etc.)
6. **Technical Details:** Extract diameter, spool weight, length, any warnings about nozzle wear.
7. **Confidence Assessment:** Evaluate confidence based on label clarity and search validation.

**IMPORTANT NOTES:**
- Include ALL relevant details in the structured output
- In 'notes' field: mention if composite/abrasive, recommended nozzle size, texture properties
- In 'features' array: list marketing features like "EASY TO PRINT", "DURABLE", "BUBBLE FREE"
- Extract exact values from label when available
- Use search to fill in missing details (like exact hex codes)
`;


const MAX_RETRIES = 2;
const MIN_LOG_LINE_LENGTH = 5;

// Helper function to extract detected data from log text
function extractDataFromLog(logText: string): Partial<FilamentData> {
    const result: Partial<FilamentData> = {};
    
    // Extract brand
    const brandMatch = logText.match(/(?:brand|manufacturer)[\s:]+([A-Z][A-Za-z0-9\s&®™]+?)(?:\.|$|,)/i);
    if (brandMatch) result.brand = brandMatch[1].trim();
    
    // Extract material
    const materialMatch = logText.match(/(?:material|type)[\s:]+([A-Z][A-Za-z0-9\s+-]+?)(?:\.|$|,)/i);
    if (materialMatch) result.material = materialMatch[1].trim();
    
    // Extract color name
    const colorMatch = logText.match(/(?:color|colour)[\s:]+([A-Za-z\s]+?)(?:\.|$|,|\()/i);
    if (colorMatch) result.colorName = colorMatch[1].trim();
    
    // Extract color hex (validates format)
    const hexMatch = logText.match(/#([A-Fa-f0-9]{6})/);
    if (hexMatch) result.colorHex = '#' + hexMatch[1].toUpperCase();
    
    // Extract nozzle temperature range (handles various dash types)
    const nozzleMatch = logText.match(/nozzle\s*(?:temp|temperature)[\s:]*(\d+)\s*[-–—]\s*(\d+)\s*°?C/i);
    if (nozzleMatch) {
        result.minTemp = parseInt(nozzleMatch[1]);
        result.maxTemp = parseInt(nozzleMatch[2]);
    }
    
    // Extract bed temperature range (handles various dash types)
    const bedMatch = logText.match(/bed\s*(?:temp|temperature)[\s:]*(\d+)\s*[-–—]\s*(\d+)\s*°?C/i);
    if (bedMatch) {
        result.bedTempMin = parseInt(bedMatch[1]);
        result.bedTempMax = parseInt(bedMatch[2]);
    }
    
    // Extract weight
    const weightMatch = logText.match(/(?:weight|mass)[\s:]*(\d+\.?\d*\s*(?:kg|g|lb))/i);
    if (weightMatch) result.weight = weightMatch[1].trim();
    
    return result;
}

export const analyzeFilamentImage = async (
    base64Image: string,
    onLog?: (log: {text: string, icon?: any, color?: string}) => void,
    onBox?: (box: {label: string, rect: number[]}) => void,
    onDataDetected?: (partialData: Partial<FilamentData>) => void
): Promise<FilamentData> => {
  const apiKey = process.env.API_KEY || (window as any).GEMINI_API_KEY; // Support both env and injected global
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");

  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
        console.log(`Gemini attempt ${attempt + 1}`);
        
        // Use structured output with streaming for logs
        const result = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                { text: "Analyze this filament spool. Stream detailed logs with LOG: prefix and BOX: prefix for bounding boxes. Be thorough and explain your findings." }
                ]
            },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ googleSearch: {} }],
                responseSchema: FilamentAnalysisSchema,
                responseMimeType: "application/json"
            }
        });

        // Use the result directly as the iterator if stream property is missing
        const streamIterator = (result as any).stream || result;

        let fullText = '';
        let textBuffer = '';
        let structuredData: any = null;

        for await (const chunk of streamIterator) {
            let chunkText = '';
             // Safely extract text
            if (typeof chunk.text === 'function') {
                chunkText = chunk.text();
            } else if (typeof (chunk as any).text === 'string') {
                chunkText = (chunk as any).text;
            } else if (chunk.candidates?.[0]?.content?.parts) {
                chunkText = chunk.candidates[0].content.parts.map((p: any) => p.text).join('');
            }

            fullText += chunkText;
            textBuffer += chunkText;

            // Process Logs from Buffer (before JSON parsing)
            let newlineIndex;
            while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
                const line = textBuffer.slice(0, newlineIndex).trim();
                textBuffer = textBuffer.slice(newlineIndex + 1);

                // Skip empty lines
                if (!line || line.length < MIN_LOG_LINE_LENGTH) {
                    continue;
                }

                if (line.startsWith('LOG: ') && onLog) {
                    const msg = line.replace('LOG: ', '').trim();
                    onLog({ text: msg, color: 'text-cyan-400' });
                    
                    // Extract data from log in real-time
                    if (onDataDetected) {
                        const extractedData = extractDataFromLog(msg);
                        if (Object.keys(extractedData).length > 0) {
                            onDataDetected(extractedData);
                        }
                    }
                } else if (line.startsWith('BOX: ') && onBox) {
                     const parts = line.match(/BOX: (.*?) \[([\d,\s]+)\]/);
                    if (parts) {
                        const label = parts[1];
                        const coords = parts[2].split(',').map(n => parseInt(n.trim()));
                        if (coords.length === 4) onBox({ label, rect: coords });
                    }
                } else if (onLog && line.length > MIN_LOG_LINE_LENGTH && !line.startsWith('{') && !line.startsWith('}')) {
                    // Fallback: treat as log even without LOG: prefix
                    onLog({ text: line, color: 'text-gray-400' });
                    
                    // Also try to extract data from non-prefixed logs
                    if (onDataDetected) {
                        const extractedData = extractDataFromLog(line);
                        if (Object.keys(extractedData).length > 0) {
                            onDataDetected(extractedData);
                        }
                    }
                }
            }
        }

        // With structured outputs, the response should be clean JSON
        // Parse the structured output
        console.log("Parsing structured output...");
        
        try {
            // Try to parse the fullText as JSON directly (structured output)
            structuredData = JSON.parse(fullText);
        } catch (e) {
            // Fallback: extract JSON from text
            console.log("Structured output not pure JSON, extracting...");
            let text = fullText;
            
            // Remove logs/boxes from text
            text = text.replace(/^LOG: .*$/gm, '').replace(/^BOX: .*$/gm, '');
            
            // Remove markdown
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Find JSON object
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                text = text.substring(firstBrace, lastBrace + 1);
                structuredData = JSON.parse(text);
            } else {
                throw new Error("No JSON found in response");
            }
        }

        // Map structured output to FilamentData
        const data: FilamentData = {
            brand: structuredData.brand || 'GENERIC',
            material: structuredData.material || 'PLA',
            colorName: structuredData.colorName || 'Unknown',
            colorHex: structuredData.colorHex || '#FFFFFF',
            minTemp: structuredData.minTemp || 200,
            maxTemp: structuredData.maxTemp || 220,
            bedTempMin: structuredData.bedTempMin || 50,
            bedTempMax: structuredData.bedTempMax || 60,
            weight: structuredData.weight || '1kg',
            diameter: structuredData.diameter || '1.75mm',
            hygroscopy: structuredData.hygroscopy || 'low',
            notes: structuredData.notes || '',
            confidence: structuredData.confidence || 50,
            source: 'Gemini 2.5 Flash'
        };
        
        // Add optional fields if present
        if (structuredData.spoolWeight) data.notes = `${data.notes}\nSpool weight: ${structuredData.spoolWeight}`.trim();
        if (structuredData.length) data.notes = `${data.notes}\nLength: ${structuredData.length}`.trim();
        if (structuredData.features && Array.isArray(structuredData.features)) {
            data.notes = `${data.notes}\nFeatures: ${structuredData.features.join(', ')}`.trim();
        }

        // Extract Grounding Source URL
        const response = await result.response;
        let referenceUrl = '';
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
            for (const chunk of chunks) {
                if (chunk.web?.uri) {
                    referenceUrl = chunk.web.uri;
                    break;
                }
            }
        }

        if (referenceUrl) {
            data.referenceUrl = referenceUrl;
            try {
                data.source = new URL(referenceUrl).hostname.replace('www.', '');
            } catch (e) {
                data.source = 'Web Search';
            }
        }

        return data;

    } catch (error) {
        console.warn(`Gemini attempt ${attempt + 1} failed:`, error);
        lastError = error;
        if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Exponential backoff
        }
    }
  }

  throw new Error(`Failed to analyze label after ${MAX_RETRIES + 1} attempts. ${lastError?.message || ''}`);
};
