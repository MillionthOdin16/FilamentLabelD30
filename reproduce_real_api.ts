
import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reproduce = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY not found in environment");
        process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey });

    // Load the image
    const imagePath = path.join(__dirname, 'PXL_20251206_005034192.jpg');
    // Try copy from /tmp if not exists
    if (!fs.existsSync(imagePath)) {
        const tmpPath = '/tmp/file_attachments/PXL_20251206_005034192.jpg';
        if (fs.existsSync(tmpPath)) {
             console.log(`Found image at ${tmpPath}, copying...`);
             fs.copyFileSync(tmpPath, imagePath);
        } else {
            console.error(`Image not found at ${tmpPath} either.`);
             process.exit(1);
        }
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

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

    console.log("Starting API call...");

    try {
        const result = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                { text: "Analyze this filament spool. Stream your thought process logs and bounding boxes, then output the final JSON." }
                ]
            },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ googleSearch: {} }]
            }
        });

        // Use the result directly as the iterator if stream property is missing
        const streamIterator = result.stream || result;

        let fullText = '';
        let chunkCount = 0;

        for await (const chunk of streamIterator) {
            chunkCount++;
            console.log(`\n--- CHUNK ${chunkCount} ---`);
            // console.log("Chunk keys:", Object.keys(chunk));

            let chunkText = '';
            if (typeof chunk.text === 'function') {
                chunkText = chunk.text();
            } else {
                console.log("chunk.text is not a function. Inspecting chunk:", JSON.stringify(chunk, null, 2));
                // Attempt to extract text manually if possible
                if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
                    chunkText = chunk.candidates[0].content.parts.map((p: any) => p.text).join('');
                }
            }

            console.log("Text:", JSON.stringify(chunkText));
            fullText += chunkText;

            const logMatches = chunkText.match(/LOG: (.*)/g);
            if (logMatches) {
                console.log("Found LOG matches:", logMatches);
            }
        }

        console.log("\n--- FULL TEXT ---");
        console.log(fullText);

    } catch (error) {
        console.error("Error during API call:", error);
    }
};

reproduce();
