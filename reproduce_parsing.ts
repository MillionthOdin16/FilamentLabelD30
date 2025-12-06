
import { analyzeFilamentImage } from './services/geminiService';
import * as fs from 'fs';
import * as path from 'path';

// Mock the GoogleGenAI library to simulate the stream without API key
// We need to bypass the actual import in geminiService.ts for this test
// or we can use a wrapper.

// Actually, simpler: let's verify the parsing logic by extracting it to a function
// and testing that function against a simulated stream string.

async function testParsing() {
    console.log("Starting test...");

    const mockStreamChunks = [
        "LOG: Starting analysis\n",
        "LOG: Found text region\n",
        "BOX: Brand Label [10, 10, 100, 50]\n",
        "LOG: Reading text...\n",
        "{\n",
        "  \"brand\": \"Prusa\",\n",
        "  \"material\": \"PLA\"\n", // Split across chunks?
        "}\n"
    ];

    let fullText = '';
    const onLog = (l: any) => console.log("Callback Log:", l);
    const onBox = (b: any) => console.log("Callback Box:", b);

    for (const chunkText of mockStreamChunks) {
        fullText += chunkText;

        // Process Logs (Logic copied from service)
        const logMatches = chunkText.match(/LOG: (.*)/g);
        if (logMatches) {
            logMatches.forEach(match => {
                const msg = match.replace('LOG: ', '').trim();
                onLog({ text: msg, color: 'text-cyan-400' });
            });
        }

        // Process Boxes (Logic copied from service)
        const boxMatches = chunkText.match(/BOX: (.*?) \[([\d,\s]+)\]/g);
        if (boxMatches) {
            boxMatches.forEach(match => {
                const parts = match.match(/BOX: (.*?) \[([\d,\s]+)\]/);
                if (parts) {
                    const label = parts[1];
                    const coords = parts[2].split(',').map(n => parseInt(n.trim()));
                    if (coords.length === 4) onBox({ label, rect: coords });
                }
            });
        }
    }

    console.log("Full Text Accumulation:", fullText);

    // Final extraction (Logic from service)
    let text = fullText;
    text = text.replace(/^LOG: .*$/gm, '').replace(/^BOX: .*$/gm, '');
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
        try {
            const data = JSON.parse(text);
            console.log("Parsed JSON:", data);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            console.log("Text attempted to parse:", text);
        }
    } else {
        console.error("No JSON found");
    }
}

testParsing();
