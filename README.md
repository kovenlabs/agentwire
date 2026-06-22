<img src="logo.svg" width="80" alt="agentwire" />

# agentwire

A tiny, typed **pub/sub event bus that wires agent tools to your UI** — with
first-class support for *interactive* (deferred) tools like "ask the user" and
"choose a component". Extracted from a production Next.js + Vercel AI SDK app and
generalized into framework-agnostic layers.

## Packages

| Package | What it is | Deps |
| --- | --- | --- |
| [`@kovenlabs/agentwire`](./packages/core) | The bus: `publish`/`subscribe`/`request`, typed channel registry, interactive-tool primitives, logger interfaces. | none |
| [`@kovenlabs/agentwire-tools`](./packages/tools) | `defineTool` factory (`server`/`client`/`approval`/`interactive`) + tool registry. | Standard Schema |
| [`@kovenlabs/agentwire-react`](./packages/react) | Generic React hooks: `useSubscribe`, `useRequest`, `useFormBridge`. | react |
| [`@kovenlabs/agentwire-ai-sdk`](./packages/ai-sdk) | **The adapter.** `toAiTool`/`toAiToolSet` + the `useAgentChat` runtime. | `ai`, `@ai-sdk/react` |

The core is framework-agnostic. The AI SDK coupling lives entirely in the adapter
package — swap in a different LLM SDK later by writing a sibling adapter without
touching anything else.

## The idea

```
              @kovenlabs/agentwire (bus)
    publish / subscribe / request — synchronous, in-memory
                     │
   ┌─────────────────┼──────────────────────┐
   ▼                 ▼                       ▼
server tools     client tools          interactive tools
(execute on      (your handlers:       (defer to UI; the UI
 the server →    navigate, banners)    publishes the result on
 publish result)                        the resolve channel →
                                        runtime calls addToolOutput)
```

## Quick start

```ts
// 1. Declare channels (your app owns these — the library ships none)
import { defineChannels, chan } from "@kovenlabs/agentwire";

export const events = defineChannels({
  templateRequest: chan<{ version: string }>("page:request-template"),
  templateCurrent: chan<Record<string, unknown>>("page:current-template"),
  templateUpdate:  chan<{ path: string; value: unknown }>("page:update-template"),
});
```

```ts
// 2. Declare tools once — server side
import { defineTool } from "@kovenlabs/agentwire-tools";
import { z } from "zod";

export const askUser = defineTool.interactive({
  name: "askUser",
  description: "Ask the user one or more questions.",
  label: "Asking you",
  inputSchema: z.object({ questions: z.array(z.string()) }),
});

export const generateTemplate = defineTool.server({
  name: "generateTemplate",
  description: "Generate a page template.",
  label: "Generating template",
  inputSchema: z.object({ pageId: z.string() }),
  execute: async ({ pageId }) => buildTemplate(pageId),
});
```

```ts
// 3. Server route — convert to AI SDK tools
import { toAiToolSet } from "@kovenlabs/agentwire-ai-sdk";
import { streamText } from "ai";

const tools = toAiToolSet({ askUser, generateTemplate }, { logger });
streamText({ model, tools, /* … */ });
```

```tsx
// 4. Client — wire the chat once
import { useAgentChat } from "@kovenlabs/agentwire-ai-sdk/react";

const chat = useAgentChat({
  chatId,
  agent: "page_builder",
  interactiveTools: ["askUser"],          // or auto-detected from the registry
  terminalTools: ["suggestFollowUps"],
  toolHandlers: {
    navigate: (call) => router.push(call.input.target),
  },
  logger,
});
```

```tsx
// 5. Render the stream — <AgentMessages> mounts your interactive widgets,
//    renders Approve/Deny for approval tools, and shows status → output.
import { AgentMessages, completeInteractive } from "@kovenlabs/agentwire-ai-sdk/react";

<AgentMessages
  chat={chat}
  interactive={{ askUser: AskUserForm }}
  slots={{ text: (t) => <p>{t}</p> }}
/>;

// inside AskUserForm — settle the call from the UI:
completeInteractive("askUser", toolCallId, { answers });
```

## Develop

```bash
pnpm install
pnpm build      # tsup → ESM + CJS + d.ts per package
pnpm test       # vitest
pnpm typecheck
```

Releases are automated with **semantic-release** (conventional commits) — pushing
to `main` cuts the version, changelog, GitHub release, and npm publish via CI.
