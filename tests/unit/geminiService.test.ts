import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeFilamentImage } from '../../services/geminiService';

// Mock import.meta.env
vi.stubGlobal('import', { meta: { env: { VITE_GEMINI_API_KEY: 'test-key' } } });

const { mockGenerateContentStream } = vi.hoisted(() => {
  return { mockGenerateContentStream: vi.fn() };
});

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      constructor() {
        return {
          models: {
            generateContentStream: mockGenerateContentStream
          }
        };
      }
    }
  };
});

// Helper to mock stream response
const createMockStreamResponse = (chunks: string[]) => {
  const stream = (async function* () {
    for (const chunk of chunks) {
      yield { text: () => chunk };
    }
  })();

  return {
    stream,
    response: Promise.resolve({ candidates: [] })
  };
};

describe('Gemini Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // We don't need to set process.env.API_KEY because we are mocking import.meta.env
  });

  it('should parse valid JSON response', async () => {
    mockGenerateContentStream.mockResolvedValue(createMockStreamResponse([
      'LOG: Analyzed\n',
      JSON.stringify({ brand: 'Test', material: 'PLA' })
    ]));

    const result = await analyzeFilamentImage('base64...');
    expect(result.brand).toBe('Test');
  });

  it('should handle markdown wrapped JSON', async () => {
    mockGenerateContentStream.mockResolvedValue(createMockStreamResponse([
      '```json\n{"brand": "Markdown", "material": "ABS"}\n```'
    ]));

    const result = await analyzeFilamentImage('base64...');
    expect(result.brand).toBe('Markdown');
  });

  it('should handle messy preamble JSON', async () => {
    mockGenerateContentStream.mockResolvedValue(createMockStreamResponse([
      'Here is the JSON: ',
      '{"brand": "Messy", "material": "PETG"}'
    ]));

    const result = await analyzeFilamentImage('base64...');
    expect(result.brand).toBe('Messy');
  });

  it('should retry on failure', async () => {
    mockGenerateContentStream
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(createMockStreamResponse([
        '{"brand": "Retry", "material": "TPU"}'
      ]));

    const result = await analyzeFilamentImage('base64...');
    expect(result.brand).toBe('Retry');
    expect(mockGenerateContentStream).toHaveBeenCalledTimes(2);
  });
});
