
import { describe, it, expect } from 'vitest';

// Implementation to be moved to geminiService.ts
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

describe('Error Parsing Logic', () => {
    it('handles Gemini 429 Quota Exceeded error string', () => {
        const error = {
            message: `[429] {
              "error": {
                "code": 429,
                "message": "You exceeded your current quota for the Pay-as-you-go API...",
                "status": "RESOURCE_EXHAUSTED"
              }
            }`
        };

        const friendly = getFriendlyErrorMessage(error);
        expect(friendly).toBe("Daily AI scan quota exceeded. Please use Manual Entry.");
    });

    it('handles wrapped 400 error with JSON', () => {
        const error = {
             message: `[400 Bad Request] {
                 "error": {
                     "code": 400,
                     "message": "Image must be valid base64",
                     "status": "INVALID_ARGUMENT"
                 }
             }`
        };
        const friendly = getFriendlyErrorMessage(error);
        expect(friendly).toBe("Image must be valid base64");
    });

    it('handles network error', () => {
        const error = { message: "TypeError: Failed to fetch" };
        const friendly = getFriendlyErrorMessage(error);
        expect(friendly).toBe("Network connection failed. Please check your internet.");
    });

    it('handles generic long error', () => {
        const longMsg = "This is a very long error message that should be truncated because it is too long to display nicely in a toast notification and we want to keep the UI clean and tidy for the user experience.";
        const friendly = getFriendlyErrorMessage({ message: longMsg });
        expect(friendly.length).toBeLessThan(160);
        expect(friendly).toContain('...');
    });
});
