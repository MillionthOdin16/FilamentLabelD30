---
description: Use the local Gemini CLI to generate text or analyze content.
---

# Gemini CLI Workflow

This workflow allows you to use the installed `gemini` CLI to query Google's Gemini models directly from the terminal.

## Prerequisites
- `GEMINI_API_KEY` must be set in the environment or `.env.local`.
- The `gemini` command must be in the PATH.

## Usage

### Basic Query
To send a simple prompt to Gemini:

```powershell
# Ensure API key is loaded (if not already in env)
# $env:GEMINI_API_KEY="YOUR_KEY" 

gemini -p "Your prompt here"
```

### Analyzing Files
You can pipe content to Gemini or include it in the prompt.

```powershell
# Example: Analyze a file
$content = Get-Content ./package.json -Raw
gemini -p "Analyze this package.json and suggest updates: $content"
```

### System Instructions
The CLI may support system instructions via config or arguments, check `gemini --help`.

## Integration Notes
- The CLI loads extensions like `github`, `genkit`, etc.
- It can be used for quick queries, code generation, or "second opinion" analysis.
