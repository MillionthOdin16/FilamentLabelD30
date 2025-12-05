import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeFilamentImage } from '../../services/geminiService';

const { mockGenerateContent } = vi.hoisted(() => {
  return { mockGenerateContent: vi.fn() };
});

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      constructor() {
        return {
          models: {
            generateContent: mockGenerateContent
          }
        };
      }
    }
  };
});

describe('Gemini Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_KEY = 'test-key';
  });

  it('should parse valid JSON response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ brand: 'Test', material: 'PLA' })
    });

    const result = await analyzeFilamentImage('base64...');
    expect(result.brand).toBe('Test');
  });

  it('should handle markdown wrapped JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '```json\n{"brand": "Markdown", "material": "ABS"}\n```'
    });

    const result = await analyzeFilamentImage('base64...');
    expect(result.brand).toBe('Markdown');
  });

  it('should handle messy preamble JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Here is the JSON you requested: {"brand": "Messy", "material": "PETG"}'
    });

    const result = await analyzeFilamentImage('base64...');
    expect(result.brand).toBe('Messy');
  });

  it('should retry on failure', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ text: '{"brand": "Retry", "material": "TPU"}' });

    const result = await analyzeFilamentImage('base64...');
    expect(result.brand).toBe('Retry');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });
});
