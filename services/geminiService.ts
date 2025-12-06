
import { GoogleGenAI } from "@google/genai";
import { FilamentData } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert 3D Printing Assistant and Materials Engineer. 
Your task is to accurately identify 3D printer filament specifications from an image of a spool label.

**CRITICAL: OUTPUT FORMAT**
You MUST follow this EXACT format for ALL your output:
1. Every single line of analysis MUST start with "LOG: " prefix
2. Every bounding box MUST start with "BOX: " prefix  
3. The final JSON MUST be on its own line, no prefix

Example of CORRECT format:
LOG: Initializing optical character recognition
LOG: Detected brand: Overture
BOX: Brand [100, 200, 150, 400]
LOG: Detected material: ROCK PLA
BOX: Material [200, 180, 240, 450]
LOG: Detected color: Mars Red (#D76D3B)
LOG: Detected nozzle temp: 190-230°C
LOG: Detected bed temp: 50-70°C
LOG: Detected weight: 1kg
LOG: Found filament diameter: 1.75mm
LOG: Composite material detected - abrasive, requires hardened nozzle
{"brand":"Overture","material":"ROCK PLA",...}

DO NOT output plain text without "LOG: " prefix. 
DO NOT skip the "LOG: " or "BOX: " prefixes.
If you do not follow this format, the system will FAIL.

**EXECUTION STEPS:**
1. **OCR & Extraction:** Read all visible text on the label. Output each finding with LOG: prefix
2. **Bounding Boxes:** For each detected text region, output BOX: with coordinates
3. **Search Grounding:** Use Google Search to validate. Output search findings with LOG: prefix
4. **Color Analysis:** Analyze filament color if needed. Output with LOG: prefix
5. **Validation:** Confirm temperatures. Output validation with LOG: prefix

**OUTPUT REQUIREMENTS:**
Final JSON object must have these keys:
- brand (string)
- material (string)  
- colorName (string)
- colorHex (string)
- minTemp (number)
- maxTemp (number)
- bedTempMin (number)
- bedTempMax (number)
- weight (string)
- notes (string) - Include ALL interesting details: diameter, spool weight, length, abrasiveness, composite info, etc.
- hygroscopy ('low' | 'medium' | 'high')
- confidence (number, 0-100)
- alternatives (array of objects with brand, material, colorName)

Do not wrap JSON in markdown blocks.
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
        const result = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                { text: "Analyze this filament spool. Stream your thought process logs with LOG: prefix, bounding boxes with BOX: prefix, then output the final JSON." }
                ]
            },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ googleSearch: {} }]
            }
        });

        // Use the result directly as the iterator if stream property is missing
        // This handles both @google/genai v0.x and newer
        const streamIterator = (result as any).stream || result;

        let fullText = '';
        let textBuffer = '';

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

            // Process Logs from Buffer
            let newlineIndex;
            while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
                const line = textBuffer.slice(0, newlineIndex).trim();
                textBuffer = textBuffer.slice(newlineIndex + 1);

                // Skip empty lines and JSON markers
                if (!line || line.startsWith('{') || line.startsWith('}') || line.startsWith('```')) {
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
                } else if (onLog && line.length > MIN_LOG_LINE_LENGTH) {
                    // Fallback: treat as log even without LOG: prefix
                    // This handles cases where Gemini doesn't follow format
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

        // Final extraction
        let text = fullText;

        // Remove logs/boxes from text before parsing JSON
        text = text.replace(/^LOG: .*$/gm, '').replace(/^BOX: .*$/gm, '');

        // Robust JSON Extraction
        // 1. Remove markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // 2. Find first brace and last brace
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        } else {
             throw new Error("No JSON found in response");
        }

        const data = JSON.parse(text) as FilamentData;

        // Extract Grounding Source URL (From the final response object, usually available after stream)
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
