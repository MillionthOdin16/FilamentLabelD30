import { vi } from 'vitest';

// Mock environment variables for all tests
vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key');
vi.stubEnv('VITE_USE_PROXY', 'false');

// Add any other global test setup here
