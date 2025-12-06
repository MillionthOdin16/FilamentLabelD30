# Environment Setup Guide

## ⚠️ Security Notice

**NEVER commit API keys to the repository!** The `.env` file is now properly excluded from git.

## Setting Up API Key

### Option 1: GitHub Secrets (Recommended for CI/CD)

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GEMINI_API_KEY`
5. Value: Your Gemini API key from https://aistudio.google.com/apikey
6. Click **Add secret**

### Option 2: Local Development

Create a `.env` file in the project root:

```bash
# .env (DO NOT COMMIT THIS FILE!)
VITE_GEMINI_API_KEY=your_api_key_here
```

**The `.env` file is already in `.gitignore`** and will not be committed.

## How the API Key is Used

The application reads the API key from `import.meta.env.VITE_GEMINI_API_KEY`:

```typescript
// services/geminiService.ts
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

## Running the Application

### Development Mode

```bash
# Set the environment variable
export VITE_GEMINI_API_KEY="your_api_key_here"

# Or use .env file (see Option 2 above)

# Start dev server
npm run dev
```

### Production Build

```bash
# Set the environment variable
export VITE_GEMINI_API_KEY="your_api_key_here"

# Build
npm run build

# Preview
npm run preview
```

### With Proxy Server (for local testing)

```bash
# Terminal 1: Start proxy server
export GEMINI_API_KEY="your_api_key_here"
node proxy-server.cjs

# Terminal 2: Start dev server  
export VITE_GEMINI_API_KEY="your_api_key_here"
npm run dev
```

## Testing the Setup

1. **Check environment variable is loaded:**
   ```bash
   npm run dev
   # Open http://localhost:3000
   # Open DevTools Console (F12)
   # You should NOT see "API Key not found" error
   ```

2. **Test image analysis:**
   - Upload a filament spool image
   - Watch console for "[LOG] Gemini attempt 1"
   - Console should show "[DEBUG] Progressive update..." messages
   - Form fields should populate with extracted data

## Troubleshooting

### "API Key not found" Error

- **Cause:** Environment variable not set
- **Fix:** Ensure `VITE_GEMINI_API_KEY` is set via `.env` file or export command

### "403: API key leaked" Error

- **Cause:** API key was posted publicly and blocked by Google
- **Fix:** Generate a new API key at https://aistudio.google.com/apikey

### CORS Errors

- **Cause:** Direct browser calls to Gemini API are blocked
- **Fix:** Use the proxy server (see above)

## Security Best Practices

1. ✅ **DO**: Use environment variables
2. ✅ **DO**: Keep `.env` in `.gitignore`
3. ✅ **DO**: Use GitHub Secrets for CI/CD
4. ✅ **DO**: Rotate keys if leaked
5. ❌ **DON'T**: Commit API keys to git
6. ❌ **DON'T**: Post keys in issues/PRs/comments
7. ❌ **DON'T**: Share keys publicly

## Current Status

- ✅ `.env` file removed from git tracking
- ✅ `.env` added to `.gitignore`
- ✅ Code updated to use `import.meta.env.VITE_GEMINI_API_KEY`
- ✅ Build successful (3.60s)
- ✅ Ready for testing with valid API key

## Next Steps

1. Set your API key using one of the methods above
2. Start the development server
3. Test with a filament image
4. Check console for debug logs
5. Verify form fields populate correctly
