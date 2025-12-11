
import { GoogleGenAI } from "@google/genai";
import { FilamentData } from "../types";

// Use proxy server to bypass CORS in development/testing
// Default to false (direct API) to avoid dependency on local proxy server
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';
const PROXY_URL = 'http://localhost:3002/api/gemini';

// Monkey-patch fetch to redirect Gemini API calls through proxy
if (USE_PROXY && typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(url: RequestInfo | URL, options?: RequestInit) {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Redirect Gemini API calls through proxy
    if (urlString.includes('generativelanguage.googleapis.com')) {
      const proxyUrl = urlString.replace('https://generativelanguage.googleapis.com', PROXY_URL);
      console.log(`[FETCH INTERCEPT] Redirecting to proxy: ${proxyUrl.split('?')[0]}`);
      return originalFetch(proxyUrl, options);
    }
    
    return originalFetch(url, options);
  };
}

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
      description: "Comprehensive notes: abrasiveness, nozzle/bed recommendations, texture, special handling, composite details, interesting facts, brand history, or unique material properties.",
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
Your task is to accurately identify 3D printer filament specifications from an image of a spool label and provide engaging, useful context.

**CRITICAL: You must provide detailed logging AND output structured JSON at the end.**

**LOGGING FORMAT (for real-time user feedback):**
1. Every analysis step MUST start with "LOG: " prefix
2. Every bounding box MUST start with "BOX: " prefix  
3. Be verbose, engaging, and detailed.
   - Instead of "Found brand", say "LOG: Identified manufacturer as Prusament (known for high precision)"
   - Instead of "Found color", say "LOG: Detected color 'Galaxy Black' - a popular sparkly black"

Example logs:
LOG: Initializing optical character recognition...
LOG: Detected brand: OVERTURE (popular reliable brand)
BOX: Brand [100, 200, 150, 400]
LOG: Detected material: ROCK PLA
LOG: Detected color name: Mars Red
LOG: Color hex code found: #D76D3B
LOG: Detected nozzle temperature range: 190-230°C
LOG: Detected bed temperature range: 50-70°C
LOG: Detected filament diameter: 1.75mm ±0.02mm
LOG: Detected empty spool weight: ~147g (cardboard spool)
LOG: Detected feature: ROCK-LIKE TEXTURE
LOG: Search results confirm Mars Red hex code and specifications
LOG: Interesting fact: Rock PLA uses marble powder to hide layer lines
LOG: Printing Tip: Use a 0.6mm nozzle to prevent clogging with composite materials

**FINAL JSON OUTPUT (after all logs):**
After streaming all your LOG: and BOX: messages, output a complete JSON object with these EXACT fields:

{
  "brand": "string - Manufacturer name",
  "material": "string - Material type with modifiers",
  "colorName": "string - Color from label",
  "colorHex": "string - Hex code with #",
  "minTemp": "number - Min nozzle temp (C)",
  "maxTemp": "number - Max nozzle temp (C)",
  "bedTempMin": "number - Min bed temp (C)",
  "bedTempMax": "number - Max bed temp (C)",
  "weight": "string - Weight with units",
  "diameter": "string - Diameter",
  "spoolWeight": "string - Empty spool weight",
  "length": "string - Filament length",
  "features": "array - Features list",
  "notes": "string - Comprehensive notes including: technical details, abrasiveness, nozzle recommendations, texture, AND interesting facts or trivia about the material/brand found during analysis.",
  "hygroscopy": "string - 'low', 'medium', or 'high'",
  "confidence": "number - Score 0-100"
}

**CRITICAL REQUIREMENTS:**
- First stream all LOG: messages as you analyze
- Then at the very end output ONLY the JSON object
- DO NOT wrap JSON in markdown code blocks
- DO NOT add any text before or after the JSON
- Include **interesting facts, printing tips, and trivia** in the 'notes' field.
- **YOU MUST OUTPUT THE JSON OBJECT** - it is required for the system to work
- Extract exact values when visible on label
- Use search to validate and fill missing details

**ANALYSIS STEPS:**
1. OCR & Text Extraction: Read ALL visible text. Log each finding.
2. Bounding Boxes: For important regions, output BOX coordinates.
3. Google Search Validation: Search for exact product. Log findings.
4. Color Analysis: Analyze visible color. Confirm with search.
5. Feature Detection: List all special features.
6. Technical Details: Extract diameter, weights, lengths, warnings.
7. Contextual Enrichment: Find interesting facts or tips about this specific filament.
8. Final JSON: Output complete structured data.
`;


const MAX_RETRIES = 2;
const MIN_LOG_LINE_LENGTH = 5;

function getFriendlyErrorMessage(error: any): string {
    const msg = error?.message || error?.toString() || '';

    // Check for specific error keywords first (Priority High)
    if (msg.includes('API Key not found')) {
        return "⚠️ API Key not found. Please configure VITE_GEMINI_API_KEY.";
    }

    if (msg.includes('RESOURCE_EXHAUSTED') || (msg.includes('429') && msg.includes('quota'))) {
        return "Daily AI scan quota exceeded. Please use Manual Entry.";
    }

    if (msg.includes('NetworkError') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        return "Network connection failed. Please check your internet.";
    }

    // Clean up raw JSON if present (e.g. GoogleGenAI often throws "[400] {...json...}")
    if (msg.includes('{') && msg.includes('}')) {
         try {
             // Extract JSON object using regex (handles potentially messy prefixes)
             // Matches from first { to last }
             const jsonMatch = msg.match(/(\{[\s\S]*\})/);
             if (jsonMatch) {
                 const parsed = JSON.parse(jsonMatch[1]);

                 // Handle standard Google API error format
                 if (parsed.error?.message) {
                     // Check if inner message is specific
                     if (parsed.error.status === 'RESOURCE_EXHAUSTED') return "Daily AI scan quota exceeded. Please use Manual Entry.";
                     return parsed.error.message;
                 }
                 if (parsed.message) return parsed.message;
             }
         } catch (e) {
             // ignore parsing error, fall back to truncation
         }
    }

    // Fallback: Truncate very long messages
    return msg.length > 150 ? msg.substring(0, 150) + '...' : msg;
}

// Helper function to extract detected data from log text
function extractDataFromLog(logText: string): Partial<FilamentData> {
    const result: Partial<FilamentData> = {};
    
    // Extract brand - STRICT: only match "Detected brand:" format
    // Matches: "Detected brand: OVERTURE®" or "Detected brand name: Overture"
    const brandMatch = logText.match(/Detected\s+(?:brand|manufacturer)(?:\s+name)?:\s*([A-Z][A-Za-z0-9\s&®™-]+?)(?:\s*$|\.)/i);
    if (brandMatch) {
        const brand = brandMatch[1].trim();
        // Validate: must be more than just "name" or generic words, and not too long
        if (brand.length > 2 && brand.length < 50 && !['name', 'brand', 'manufacturer', 'the', 'is'].includes(brand.toLowerCase())) {
            result.brand = brand;
        }
    }
    
    // Extract material - STRICT: only match "Detected material:" format
    // Matches: "Detected material: ROCK PLA" or "Detected material type: PETG"
    const materialMatch = logText.match(/Detected\s+(?:material|type)(?:\s+type)?:\s*([A-Z][A-Za-z0-9\s+\-]+?)(?:\s*$|\.)/i);
    if (materialMatch) {
        const material = materialMatch[1].trim();
        // Validate: must not be a sentence fragment and reasonable length
        if (material.length <= 30 && material.length > 2 && 
            !material.toLowerCase().includes('may not') && 
            !material.toLowerCase().includes('inherently') &&
            !material.toLowerCase().includes('with ') &&
            !material.toLowerCase().includes('made ')) {
            result.material = material;
        }
    }
    
    // Extract color name - STRICT: only match "Detected color:" format  
    // Matches: "Detected color name: Mars Red" or "Detected color: Red"
    const colorMatch = logText.match(/Detected\s+(?:color|colour)(?:\s+name)?:\s*([A-Z][A-Za-z\s-]+?)(?:\s*$|\.)/i);
    if (colorMatch) {
        const color = colorMatch[1].trim();
        // Validate: must be a reasonable color name, not a sentence, not too long
        if (color.length <= 30 && color.length > 2 &&
            !color.toLowerCase().includes('name on') && 
            !color.toLowerCase().includes('separate') &&
            !color.toLowerCase().includes('and ') &&
            !color.toLowerCase().includes('provide')) {
            result.colorName = color;
        }
    }
    
    // Extract color hex (validates format)
    const hexMatch = logText.match(/#([A-Fa-f0-9]{6})/);
    if (hexMatch) result.colorHex = '#' + hexMatch[1].toUpperCase();
    
    // Extract nozzle temperature range (handles various dash types)
    const nozzleMatch = logText.match(/nozzle\s*(?:temp|temperature)(?:\s+range)?[\s:]*(\d+)\s*[-–—]\s*(\d+)\s*°?C/i);
    if (nozzleMatch) {
        result.minTemp = parseInt(nozzleMatch[1]);
        result.maxTemp = parseInt(nozzleMatch[2]);
    }
    
    // Extract bed temperature range (handles various dash types)
    const bedMatch = logText.match(/bed\s*(?:temp|temperature)(?:\s+range)?[\s:]*(\d+)\s*[-–—]\s*(\d+)\s*°?C/i);
    if (bedMatch) {
        result.bedTempMin = parseInt(bedMatch[1]);
        result.bedTempMax = parseInt(bedMatch[2]);
    }
    
    // Extract weight
    const weightMatch = logText.match(/(?:detected\s+)?(?:weight|mass)(?:\s+range)?[\s:]*(\d+\.?\d*\s*(?:kg|g|lb))/i);
    if (weightMatch) result.weight = weightMatch[1].trim();
    
    return result;
}

export const analyzeFilamentImage = async (
    base64Image: string,
    onLog?: (log: {text: string, icon?: any, color?: string}) => void,
    onBox?: (box: {label: string, rect: number[]}) => void,
    onDataDetected?: (partialData: Partial<FilamentData>) => void
): Promise<FilamentData> => {
  // Get API key from environment variable (set via GitHub secrets)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    // Log error for user visibility
    if (onLog) {
      onLog({ text: "❌ ERROR: Gemini API key not configured", color: "text-red-500" });
      onLog({ text: "Please set VITE_GEMINI_API_KEY in environment variables or .env file", color: "text-yellow-500" });
      onLog({ text: "See ENV_SETUP.md for configuration instructions", color: "text-yellow-500" });
    }
    throw new Error("API Key not found. Please configure VITE_GEMINI_API_KEY environment variable. See ENV_SETUP.md for instructions.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");

  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
        console.log(`Gemini attempt ${attempt + 1}`);
        
        // NOTE: We can't use responseSchema with streaming because it forces pure JSON output
        // This prevents LOG: prefixed messages from appearing, breaking the UX
        // Instead, we stream logs normally and parse JSON carefully at the end
        const result = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                { text: "Analyze this filament spool label thoroughly. First, stream detailed LOG: messages as you identify each piece of information. Then at the very end, output a complete JSON object with all the extracted data. The JSON must be valid and not wrapped in markdown. This JSON is critical - the system depends on it." }
                ]
            },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ googleSearch: {} }]
                // NOTE: No responseSchema here - it breaks streaming logs
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

        // Parse the JSON output (after all LOG: messages)
        console.log("Parsing JSON output...");
        
        let data: FilamentData;
        
        try {
            // Remove logs/boxes from text
            let text = fullText.replace(/^LOG: .*$/gm, '').replace(/^BOX: .*$/gm, '');
            
            // Remove markdown
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Find JSON object
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                text = text.substring(firstBrace, lastBrace + 1);
                const parsed = JSON.parse(text);
                
                // Map to FilamentData with all new fields
                data = {
                    brand: parsed.brand || 'GENERIC',
                    material: parsed.material || 'PLA',
                    colorName: parsed.colorName || 'Unknown',
                    colorHex: parsed.colorHex || '#FFFFFF',
                    minTemp: parsed.minTemp || 200,
                    maxTemp: parsed.maxTemp || 220,
                    bedTempMin: parsed.bedTempMin || 50,
                    bedTempMax: parsed.bedTempMax || 60,
                    weight: parsed.weight || '1kg',
                    // diameter is not in FilamentData, append to notes
                    hygroscopy: parsed.hygroscopy || 'low',
                    notes: parsed.notes || '',
                    confidence: parsed.confidence || 50,
                    source: 'Gemini 2.5 Flash'
                };
                
                // Append optional fields to notes if present
                if (parsed.spoolWeight && !data.notes.includes(parsed.spoolWeight)) {
                    data.notes = `${data.notes}\nSpool weight: ${parsed.spoolWeight}`.trim();
                }
                if (parsed.length && !data.notes.includes(parsed.length)) {
                    data.notes = `${data.notes}\nLength: ${parsed.length}`.trim();
                }
                if (parsed.diameter && !data.notes.includes(parsed.diameter)) {
                    data.notes = `${data.notes}\nDiameter: ${parsed.diameter}`.trim();
                }
                if (parsed.features && Array.isArray(parsed.features) && parsed.features.length > 0) {
                    data.notes = `${data.notes}\nFeatures: ${parsed.features.join(', ')}`.trim();
                }
            } else {
                throw new Error("No JSON object found in response");
            }
        } catch (e) {
            console.error("JSON parsing failed:", e);
            console.warn("Using default values - rely on real-time extraction instead");
            // Don't throw - return defaults and let real-time extracted data take priority
            data = {
                brand: 'GENERIC',
                material: 'PLA',
                colorName: 'Unknown',
                colorHex: '#FFFFFF',
                minTemp: 200,
                maxTemp: 220,
                bedTempMin: 50,
                bedTempMax: 60,
                weight: '1kg',
                // diameter not in FilamentData
                hygroscopy: 'low' as const,
                notes: 'Analysis completed but JSON parsing failed. Data extracted from logs.',
                confidence: 0,
                source: 'Gemini 2.5 Flash'
            };
        }

        // Extract Grounding Source URL
        const response = await (result as any).response;
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

  // Use the helper to parse the error message
  const friendlyError = getFriendlyErrorMessage(lastError);
  throw new Error(friendlyError);
};
