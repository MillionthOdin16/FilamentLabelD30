
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

export const analyzeFilamentImage = async (base64Image: string): Promise<FilamentData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");

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
    
    // Clean potentially markdown-formatted JSON
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(text) as FilamentData;

    // Extract Grounding Source URL
    let referenceUrl = '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
        // Try to find the first Web chunk with a URI
        for (const chunk of chunks) {
            if (chunk.web?.uri) {
                referenceUrl = chunk.web.uri;
                break;
            }
        }
    }
    
    if (referenceUrl) {
        data.referenceUrl = referenceUrl;
        data.source = new URL(referenceUrl).hostname.replace('www.', '');
    }

    return data;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze filament label.");
  }
};
