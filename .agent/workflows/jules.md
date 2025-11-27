---
description: Use the Jules autonomous agent for complex coding tasks.
---

# Jules Workflow

Jules is an autonomous coding agent capable of handling complex tasks, managing sessions, and interacting with GitHub.

## Prerequisites
- Authenticated via `jules login` (Already configured).
- `gemini-cli-jules` extension installed for Gemini CLI integration.

## Usage

### Starting a New Task
To assign a new task to Jules in the current directory:

```powershell
jules new "Refactor the authentication service to use OAuth2"
```

### Listing Sessions
To view active or past sessions:

```powershell
jules remote list --session
```

### Integration with Gemini CLI
You can pipe output from Gemini directly to Jules to create tasks from analysis:

```powershell
gemini -p "Analyze the bugs in this file and create a fix plan" | jules new
```

### GitHub Integration
Jules can work with GitHub issues:

```powershell
# Create a session from a GitHub issue
gh issue list --limit 1 --json title | jq -r '.[0].title' | jules new
```

## Tips
- Jules works best with clear, actionable instructions.
- Use `jules remote` to manage long-running sessions.
