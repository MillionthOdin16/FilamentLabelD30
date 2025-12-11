
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
You are an expert 3D Printing Materials Analyst specializing in filament identification. 
Your task is to accurately extract ALL specifications from a 3D printer filament spool label and provide actionable printing guidance.

**TASK OVERVIEW:**
Analyze the filament spool label image to identify: manufacturer, material type, color, temperature ranges, physical properties, and special features. Provide real-time logging and output structured JSON.

**LOGGING FORMAT (for real-time user feedback):**
1. ALWAYS prefix analysis steps with "LOG: " 
2. ALWAYS prefix detected regions with "BOX: [label] [ymin, xmin, ymax, xmax]"
3. Be specific and informative - explain WHY each finding matters to printing
4. Use this format for detections:
   - "LOG: Detected brand: BRANDNAME (reputation/known-for)"
   - "LOG: Detected material: MATERIAL (key-property)"
   - "LOG: Detected color name: COLORNAME"
   - "LOG: Color hex code found: #HEXCODE"
   - "LOG: Detected nozzle temperature range: MIN-MAX°C"
   - "LOG: Detected bed temperature range: MIN-MAX°C"

**OPTIMIZED ANALYSIS WORKFLOW:**
1. **Initial Scan** - Identify label type and orientation
   LOG: Analyzing spool label layout and text orientation...
   
2. **Brand Recognition** - Look for manufacturer name/logo (usually prominent)
   BOX: Brand [coordinates]
   LOG: Detected brand: BRANDNAME (describe reputation)
   
3. **Material Identification** - Find material type (PLA, PETG, ABS, TPU, etc.)
   BOX: Material [coordinates]
   LOG: Detected material: MATERIAL (mention key property: strength/flexibility/temp-resistance)
   
4. **Color Analysis** - Extract color name AND analyze visual color
   LOG: Detected color name: COLORNAME
   LOG: Color hex code found: #HEXCODE (or estimate from image)
   
5. **Temperature Specifications** - Critical for printing success
   LOG: Detected nozzle temperature range: MIN-MAX°C
   LOG: Detected bed temperature range: MIN-MAX°C
   
6. **Physical Properties** - Weight, diameter, length, spool weight
   LOG: Detected weight: VALUE
   LOG: Detected filament diameter: VALUE
   LOG: Detected length: VALUE (if available)
   LOG: Detected empty spool weight: VALUE (if available)
   
7. **Special Features** - Look for: composite/filled, flexible, silk, matte, glow, UV-resistant, etc.
   LOG: Detected feature: FEATURE (explain benefit)
   
8. **Moisture Sensitivity** - Determine hygroscopy based on material
   LOG: Material moisture sensitivity: LOW/MEDIUM/HIGH
   
9. **Web Search Validation** - Search for product to verify specs and gather tips
   LOG: Searching for "[brand] [material] [color]" specifications...
   LOG: Found product page: [url]
   LOG: Verified specifications match/differ...
   LOG: Additional info: [interesting-fact-or-tip]
   
10. **Confidence Assessment** - Calculate based on detected fields
    LOG: Analysis confidence: XX% (based on Y/Z fields detected)

**FINAL JSON OUTPUT:**
After ALL logs, output this JSON structure (NO markdown blocks):

{
  "brand": "Exact manufacturer name from label",
  "material": "Complete material type (include modifiers like 'Silk', 'Carbon Fiber', 'Rock')",
  "colorName": "Exact color name from label",
  "colorHex": "#HEXCODE (from color swatch or visual analysis)",
  "minTemp": 190,
  "maxTemp": 230,
  "bedTempMin": 50,
  "bedTempMax": 70,
  "weight": "1kg",
  "diameter": "1.75mm",
  "spoolWeight": "200g",
  "length": "330m",
  "features": ["Feature 1", "Feature 2"],
  "notes": "Comprehensive printing guidance: abrasiveness level (use hardened nozzle?), optimal nozzle size, bed adhesion tips, special handling (drying requirements), material properties (brittle/flexible/strong), print settings recommendations, common issues and solutions, interesting trivia about material or brand.",
  "hygroscopy": "low|medium|high",
  "confidence": 85
}

**CRITICAL RULES:**
✓ Stream detailed LOG messages for user engagement
✓ Use Google Search tool to validate and enrich data
✓ Extract EXACT text from label (don't infer brand names)
✓ Provide actionable printing tips in notes field
✓ Output clean JSON at end (NO markdown, NO extra text)
✓ If text unclear, state uncertainty: "LOG: Brand partially visible, best guess: X"
✓ Confidence score = (detected_required_fields / total_required_fields) * 100

**MATERIAL-SPECIFIC GUIDANCE:**
- PLA/PLA+: Low hygroscopy, easy printing, mention biodegradable
- PETG: Medium hygroscopy, strong, flexible, mention stringing tendency
- ABS/ASA: Medium hygroscopy, needs enclosure, mention fumes
- TPU/Flexible: High hygroscopy, slow printing, mention retraction settings
- Nylon: High hygroscopy, MUST dry before use, very hygroscopic
- Composites (Wood/Metal/Carbon): Abrasive, recommend hardened nozzle
- Silk/Satin: Aesthetic finish, mention slower speeds for better finish
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
// Enhanced with more flexible patterns and better validation
function extractDataFromLog(logText: string): Partial<FilamentData> {
    const result: Partial<FilamentData> = {};
    
    // Extract brand - Multiple pattern support
    // Matches: "Detected brand: OVERTURE®", "Brand: Hatchbox", "Manufacturer: eSUN"
    const brandPatterns = [
        /Detected\s+(?:brand|manufacturer)(?:\s+name)?:\s*([A-Z][A-Za-z0-9\s&®™+'-]+?)(?:\s*[(\n]|$|\.)/i,
        /(?:^|\s)brand:\s*([A-Z][A-Za-z0-9\s&®™+'-]+?)(?:\s*[(\n]|$|\.)/i,
        /manufacturer:\s*([A-Z][A-Za-z0-9\s&®™+'-]+?)(?:\s*[(\n]|$|\.)/i
    ];
    
    for (const pattern of brandPatterns) {
        const match = logText.match(pattern);
        if (match) {
            const brand = match[1].trim();
            // Validate: reasonable brand name
            if (brand.length >= 2 && brand.length < 50 && 
                !['name', 'brand', 'manufacturer', 'the', 'is', 'from'].includes(brand.toLowerCase()) &&
                !brand.toLowerCase().includes('unknown')) {
                result.brand = brand;
                break;
            }
        }
    }
    
    // Extract material - Enhanced patterns
    // Matches: "Detected material: ROCK PLA", "Material type: Carbon Fiber PETG", "Material: Silk PLA+"
    const materialPatterns = [
        /Detected\s+(?:material|type)(?:\s+type)?:\s*([A-Z][A-Za-z0-9\s+\-/]+?)(?:\s*[(\n]|$|\.)/i,
        /(?:^|\s)material(?:\s+type)?:\s*([A-Z][A-Za-z0-9\s+\-/]+?)(?:\s*[(\n]|$|\.)/i,
        /filament\s+type:\s*([A-Z][A-Za-z0-9\s+\-/]+?)(?:\s*[(\n]|$|\.)/i
    ];
    
    for (const pattern of materialPatterns) {
        const match = logText.match(pattern);
        if (match) {
            const material = match[1].trim();
            // Validate: reasonable material name
            if (material.length <= 40 && material.length > 2 && 
                !material.toLowerCase().includes('may not') && 
                !material.toLowerCase().includes('inherently') &&
                !material.toLowerCase().includes('sensitivity') &&
                !material.toLowerCase().includes('unknown')) {
                result.material = material;
                break;
            }
        }
    }
    
    // Extract color name - Multiple patterns
    // Matches: "Detected color name: Mars Red", "Color: Galaxy Black", "Colour name: Ocean Blue"
    const colorPatterns = [
        /Detected\s+(?:color|colour)(?:\s+name)?:\s*([A-Z][A-Za-z\s\-/]+?)(?:\s*[(\n]|$|\.)/i,
        /(?:^|\s)(?:color|colour)(?:\s+name)?:\s*([A-Z][A-Za-z\s\-/]+?)(?:\s*[(\n]|$|\.)/i
    ];
    
    for (const pattern of colorPatterns) {
        const match = logText.match(pattern);
        if (match) {
            const color = match[1].trim();
            // Validate: reasonable color name
            if (color.length <= 40 && color.length > 2 &&
                !color.toLowerCase().includes('name on') && 
                !color.toLowerCase().includes('separate') &&
                !color.toLowerCase().includes('hex') &&
                !color.toLowerCase().includes('unknown')) {
                result.colorName = color;
                break;
            }
        }
    }
    
    // Extract color hex - Enhanced pattern
    const hexMatch = logText.match(/#([A-Fa-f0-9]{6})\b/);
    if (hexMatch) result.colorHex = '#' + hexMatch[1].toUpperCase();
    
    // Extract nozzle temperature - More flexible patterns
    const nozzlePatterns = [
        /(?:nozzle|extruder|printing)\s*(?:temp|temperature)(?:\s+range)?[\s:]*(\d{2,3})\s*[-–—~]\s*(\d{2,3})\s*°?C/i,
        /print(?:ing)?\s*temp(?:erature)?[\s:]*(\d{2,3})\s*[-–—~]\s*(\d{2,3})\s*°?C/i,
        /temp(?:erature)?[\s:]*(\d{2,3})\s*[-–—~]\s*(\d{2,3})\s*°?C(?!.*bed)/i
    ];
    
    for (const pattern of nozzlePatterns) {
        const match = logText.match(pattern);
        if (match) {
            const temp1 = parseInt(match[1]);
            const temp2 = parseInt(match[2]);
            // Validate: reasonable nozzle temps (150-350°C)
            if (temp1 >= 150 && temp1 <= 350 && temp2 >= 150 && temp2 <= 350) {
                result.minTemp = Math.min(temp1, temp2);
                result.maxTemp = Math.max(temp1, temp2);
                break;
            }
        }
    }
    
    // Extract bed temperature - Enhanced patterns
    const bedPatterns = [
        /(?:bed|platform|build\s*plate)\s*(?:temp|temperature)(?:\s+range)?[\s:]*(\d{2,3})\s*[-–—~]\s*(\d{2,3})\s*°?C/i,
        /heated\s*bed[\s:]*(\d{2,3})\s*[-–—~]\s*(\d{2,3})\s*°?C/i
    ];
    
    for (const pattern of bedPatterns) {
        const match = logText.match(pattern);
        if (match) {
            const temp1 = parseInt(match[1]);
            const temp2 = parseInt(match[2]);
            // Validate: reasonable bed temps (0-150°C)
            if (temp1 >= 0 && temp1 <= 150 && temp2 >= 0 && temp2 <= 150) {
                result.bedTempMin = Math.min(temp1, temp2);
                result.bedTempMax = Math.max(temp1, temp2);
                break;
            }
        }
    }
    
    // Extract weight - Multiple patterns
    const weightPatterns = [
        /(?:detected\s+)?(?:weight|mass|net\s*weight)[\s:]*(\d+\.?\d*\s*(?:kg|g|lb|oz))/i,
        /(?:spool|filament)\s+weight[\s:]*(\d+\.?\d*\s*(?:kg|g|lb|oz))/i,
        /(\d+\.?\d*)\s*(?:kg|g|lb|oz)(?:\s+net|\s+weight)?/i
    ];
    
    for (const pattern of weightPatterns) {
        const match = logText.match(pattern);
        if (match) {
            result.weight = match[1].trim();
            break;
        }
    }
    
    // Extract diameter
    const diameterMatch = logText.match(/(?:diameter|dia\.?)[\s:]*(\d+\.?\d*\s*mm)/i);
    if (diameterMatch) {
        // Store in notes since diameter isn't in FilamentData
        result.notes = (result.notes || '') + `\nDiameter: ${diameterMatch[1]}`;
    }
    
    // Extract hygroscopy/moisture sensitivity
    const hygroMatch = logText.match(/(?:moisture|hygroscopy|hygroscopic)[\s:]*(low|medium|high)/i);
    if (hygroMatch) {
        result.hygroscopy = hygroMatch[1].toLowerCase() as 'low' | 'medium' | 'high';
    }
    
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
                { text: "Analyze this 3D printer filament spool label image using the optimized workflow. Extract ALL specifications visible on the label: brand/manufacturer, material type (PLA/PETG/ABS/etc. with any modifiers), color name, temperatures (nozzle & bed), weight, diameter, and features. Stream informative LOG: messages as you detect each field. Use Google Search to validate and enrich your findings. End with a clean JSON object (no markdown) containing all extracted data. Be thorough and accurate - this data will be used for label printing and print settings." }
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
