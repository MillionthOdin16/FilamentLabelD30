
import { GoogleGenAI } from "@google/genai";
import { FilamentData } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert 3D Printing Assistant and Materials Engineer. 
Your task is to accurately identify 3D printer filament specifications from an image of a spool label.

**EXECUTION STEPS:**
1. **OCR & Extraction:** Read all visible text on the label. Look for Brand, Material (PLA, PETG, ABS, etc.), Color, Temperatures, and Weight.
2. **Search Grounding:** Use Google Search to find the specific manufacturer's product page for this exact filament to confirm specifications (Temps, Density, Hygroscopy).
3. **Color Analysis:** If the color name is missing, analyze the image of the filament itself.
4. **Validation:** Ensure the temperatures match the manufacturer's recommended settings found online.

**OUTPUT REQUIREMENTS:**
You must strictly output valid JSON. 
The JSON object must have the following keys:
- brand (string)
- material (string)
- colorName (string)
- colorHex (string)
- minTemp (number)
- maxTemp (number)
- bedTempMin (number)
- bedTempMax (number)
- weight (string)
- notes (string)
- hygroscopy ('low' | 'medium' | 'high')
- confidence (number, 0-100)
- alternatives (array of objects with brand, material, colorName)

**REAL-TIME LOGGING:**
Before outputting the final JSON, you MUST "think out loud" by printing log lines as you process the image.
Start every log line with "LOG: ".
Start every bounding box detection with "BOX: ".
Format:
LOG: <Action description>
BOX: <Label> [ymin, xmin, ymax, xmax] (0-1000 scale)

Example:
LOG: Scanning image for text regions...
LOG: Detected brand logo "Overture".
BOX: Brand [100, 200, 150, 400]
LOG: Analyzing color spectrum...

Finally, output the JSON object.
Do not wrap the output in markdown blocks.
`;

const MAX_RETRIES = 2;

export const analyzeFilamentImage = async (
    base64Image: string,
    onLog?: (log: {text: string, color: string}) => void,
    onBox?: (box: {label: string, rect: number[]}) => void
): Promise<FilamentData> => {
  const apiKey = process.env.API_KEY;
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
                { text: "Analyze this filament spool. Stream your thought process logs and bounding boxes, then output the final JSON." }
                ]
            },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ googleSearch: {} }]
            }
        });

        let fullText = '';

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;

            // Process Logs with categorization
            const logMatches = chunkText.match(/LOG: (.*)/g);
            if (logMatches && onLog) {
                logMatches.forEach(match => {
                    const msg = match.replace('LOG: ', '').trim();
                    
                    // Categorize log messages for better visual presentation
                    let category = 'info';
                    let color = 'text-cyan-400';
                    
                    if (msg.toLowerCase().includes('scanning') || msg.toLowerCase().includes('analyzing')) {
                        category = 'scan';
                        color = 'text-blue-400';
                    } else if (msg.toLowerCase().includes('detected') || msg.toLowerCase().includes('found') || msg.toLowerCase().includes('extracted')) {
                        category = 'detect';
                        color = 'text-green-400';
                    } else if (msg.toLowerCase().includes('search') || msg.toLowerCase().includes('consulting')) {
                        category = 'search';
                        color = 'text-purple-400';
                    } else if (msg.toLowerCase().includes('confirming') || msg.toLowerCase().includes('determining') || msg.toLowerCase().includes('assessing')) {
                        category = 'validate';
                        color = 'text-yellow-400';
                    } else if (msg.toLowerCase().includes('complete') || msg.toLowerCase().includes('finalizing')) {
                        category = 'complete';
                        color = 'text-emerald-400';
                    }
                    
                    onLog({ text: msg, color, category });
                });
            }

            // Process Boxes
            const boxMatches = chunkText.match(/BOX: (.*?) \[([\d,\s]+)\]/g);
            if (boxMatches && onBox) {
                boxMatches.forEach(match => {
                    // Re-parse the specific line to be safe
                    const parts = match.match(/BOX: (.*?) \[([\d,\s]+)\]/);
                    if (parts) {
                        const label = parts[1];
                        const coords = parts[2].split(',').map(n => parseInt(n.trim()));
                        if (coords.length === 4) onBox({ label, rect: coords });
                    }
                });
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
        
        // Notify UI of retry attempt
        if (onLog && attempt < MAX_RETRIES) {
            onLog({ text: `Analysis attempt ${attempt + 1} failed. Retrying...`, color: 'text-yellow-400' });
        }
        
        if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Exponential backoff
        }
    }
  }
  
  // Notify UI of final failure
  if (onLog) {
      onLog({ text: `Analysis failed after ${MAX_RETRIES + 1} attempts.`, color: 'text-red-400' });
  }

  throw new Error(`Failed to analyze label after ${MAX_RETRIES + 1} attempts. ${lastError?.message || ''}`);
};
