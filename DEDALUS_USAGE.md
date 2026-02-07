# How Timeline Uses Dedalus

Timeline integrates [Dedalus Labs](https://docs.dedaluslabs.ai) in two distinct ways: as an **AI writing detection service** that enforces our human-only content policy, and as an **MCP (Model Context Protocol) server** for developer tooling and documentation access.

---

## 1. AI Writing Detection

Timeline's core philosophy is empowering human creators. Every essay uploaded to the platform must pass AI detection before it's published. We use the **Dedalus SDK** (`dedalus-labs` npm package) to power this check.

### How It Works

The detection pipeline lives in `app/api/validate-text/route.ts`:

1. **User submits an essay** via the upload form (`app/(main)/upload/page.tsx`)
2. **Client sends the text** to `/api/validate-text` as a POST request
3. **Server initializes the Dedalus client** and sends the text to Claude Opus 4.5 with a specialized detection prompt
4. **The model analyzes** the text for AI-generated patterns (formulaic phrasing, lack of personal voice, overly balanced language, etc.)
5. **The response is scored** on a 0.0 (definitely human) to 1.0 (definitely AI) scale
6. **Text is rejected** if the AI probability exceeds the threshold (0.65)

### Key Implementation Details

- **Model used:** `anthropic/claude-opus-4-5` via the Dedalus unified API
- **Temperature:** 0.1 (low, for consistent analysis)
- **Minimum text length:** 100 characters (shorter text isn't reliable for detection)
- **Threshold:** 0.65 -- text scoring above this is flagged as AI-generated
- **Fail-open behavior:** If parsing fails, the upload is allowed through (with a warning logged)
- **Auth required:** Only authenticated users can trigger detection (Supabase auth check)

### Code Example

```typescript
import Dedalus from "dedalus-labs";

const client = new Dedalus({ apiKey: DEDALUS_API_KEY });

const completion = await client.chat.completions.create({
  model: "anthropic/claude-opus-4-5",
  messages: [
    { role: "system", content: DETECTION_PROMPT },
    { role: "user", content: `Analyze this text:\n\n${text}` },
  ],
  temperature: 0.1,
});
```

The response is parsed as JSON containing `ai_probability` and `reasoning`, which are returned to the client along with a pass/fail determination.

### User-Facing Flow

When an essay is rejected, the user sees:

> "This essay appears to be AI-generated (confidence: 78%). Timeline only accepts human-written content."

---

## 2. Automated Code Review (Pre-Commit Hook)

We also use Dedalus for **AI-powered code review** that runs automatically before every commit via a Husky pre-commit hook.

### How It Works

The review script lives in `scripts/code-review.ts`:

1. **Developer stages changes** and runs `git commit`
2. **Husky pre-commit hook** (`.husky/pre-commit`) triggers TypeScript type checking, then runs the code review
3. **The script collects staged files** (`.ts`, `.tsx`, `.sql`, `.json`)
4. **Each file's diff is sent to Dedalus** using the `DedalusRunner` with `openai/gpt-5.2`
5. **The model reviews for:** syntax errors, security vulnerabilities (SQL injection, XSS), missing RLS policies, auth bypasses, hardcoded secrets
6. **Critical issues block the commit;** warnings are displayed but allowed through

### Key Implementation Details

- **SDK classes used:** `Dedalus` client + `DedalusRunner` (agent runner)
- **Model:** `openai/gpt-5.2` via Dedalus unified API (demonstrating multi-provider routing)
- **Context:** The review prompt includes project conventions from `CLAUDE.md`
- **Response format:** Structured JSON with severity levels (`critical`, `warning`, `info`)
- **Skip mechanism:** `SKIP_REVIEW=true` env var or `--skip` flag for emergencies

### Code Example

```typescript
import { Dedalus, DedalusRunner } from "dedalus-labs";

const client = new Dedalus({ apiKey: process.env.DEDALUS_API_KEY });
const runner = new DedalusRunner(client);

const result = await runner.run({
  input: `Review this code change in ${file}:\n\`\`\`diff\n${diff}\n\`\`\``,
  model: "openai/gpt-5.2",
  instructions: "Review code for security, conventions, and best practices...",
  response_format: { type: "json_object" },
});
```

---

## 3. Dedalus MCP (Documentation Server)

We use the **Dedalus documentation MCP server** for real-time access to Dedalus docs during development. This is configured as an MCP server in our Claude Code setup (`.claude/settings.local.json`).

### What It Provides

- **Tool:** `SearchDedalusLabs` -- searches the Dedalus knowledge base via GraphQL
- **Use case:** When building or debugging Dedalus integrations, the MCP server lets our AI assistant query the latest SDK docs, API references, and guides directly
- **Endpoint:** `https://docs.dedaluslabs.ai/mcp`

### How We Use It

The MCP server is enabled in `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": ["mcp__docs-dedalus__SearchDedalusLabs"]
  },
  "enableAllProjectMcpServers": true
}
```

This lets us ask Claude Code questions like:
- "How do I configure MCP servers with the Dedalus SDK?"
- "What's the correct way to use DedalusRunner?"
- "How do I test MCP servers?"

And get answers pulled directly from the latest Dedalus documentation.

### MCP Testing Patterns (from Dedalus Docs)

Dedalus provides testing utilities for MCP servers via `MCPClient`:

```python
# Integration test example from Dedalus docs
from dedalus_mcp.client import MCPClient

async def test_call_tool(client):
    result = await client.call_tool("add", {"a": 2, "b": 3})
    assert result.content[0].text == "5"
```

Key testing approaches:
- **Unit tests:** Test tool handlers as normal functions
- **Integration tests:** Use `MCPClient` to connect to a running server and call tools
- **Authorization tests:** Test protected tools with `BearerAuth` tokens

---

## Summary

| Integration | Purpose | SDK/Tool | Model |
|---|---|---|---|
| AI Writing Detection | Block AI-generated essays | `Dedalus` client (`chat.completions`) | `anthropic/claude-opus-4-5` |
| Code Review | Pre-commit security & convention checks | `Dedalus` + `DedalusRunner` | `openai/gpt-5.2` |
| Docs MCP Server | Real-time documentation access | `SearchDedalusLabs` MCP tool | N/A (search) |

### Package

```json
"dedalus-labs": "^0.1.0-alpha.8"
```

All three integrations demonstrate Dedalus's unified API -- one SDK, one API key, access to multiple providers and MCP servers.
