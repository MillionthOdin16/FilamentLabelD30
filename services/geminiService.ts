
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

Do not wrap the output in markdown blocks. Return only the raw JSON string.
`;

const MAX_RETRIES = 2;

export const analyzeFilamentImage = async (base64Image: string): Promise<FilamentData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");

  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
        const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
            { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
            { text: "Analyze this filament spool. Use Google Search to verify specs. Return valid JSON only." }
            ]
        },
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            // responseMimeType and responseSchema are NOT supported when using tools
            tools: [{ googleSearch: {} }]
        }
        });

        let text = response.text;
        if (!text) throw new Error("No data returned from AI");

        // Robust JSON Extraction
        // 1. Remove markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // 2. Find first brace and last brace
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }

        const data = JSON.parse(text) as FilamentData;

        // Extract Grounding Source URL
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
