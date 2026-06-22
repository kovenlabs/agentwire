import {
  type AgentToolDefinition,
  defineTool,
  getInteractiveToolNames,
  getToolKind,
  type ToolKind,
} from "@kovenlabs/agentwire-tools";
import { z } from "zod";
import type { Equal, Expect } from "./assert.js";

const schema = z.object({ pageId: z.string(), count: z.number() });

// ── server: execute input is inferred from the schema ───────────────
const generate = defineTool.server({
  name: "generateTemplate",
  description: "Generate a template",
  label: "Generating template",
  inputSchema: schema,
  execute: (input) => {
    type _in = Expect<Equal<typeof input, { pageId: string; count: number }>>;
    return { ok: true };
  },
});
type _def = Expect<Equal<typeof generate, AgentToolDefinition<typeof schema>>>;

// ── server requires execute ─────────────────────────────────────────
defineTool.server({
  name: "x",
  description: "",
  label: "",
  inputSchema: z.object({}),
  // @ts-expect-error execute argument must match the schema (no `id` field)
  execute: (input: { id: string }) => input.id,
});

// ── client/interactive reject an execute (no server work) ───────────
defineTool.client({
  name: "navigate",
  description: "",
  label: "",
  inputSchema: z.object({ target: z.string() }),
  // @ts-expect-error client tools have no execute
  execute: () => null,
});

defineTool.interactive({
  name: "askUser",
  description: "",
  label: "",
  inputSchema: z.object({ questions: z.array(z.string()) }),
  // @ts-expect-error interactive tools have no execute
  execute: () => null,
});

// ── approval accepts an extra approvalDescription ───────────────────
defineTool.approval({
  name: "activate",
  description: "Publish the page",
  approvalDescription: "This makes the page public.",
  label: "Activating",
  inputSchema: z.object({ pageId: z.string() }),
  execute: () => null,
});

// ── registry accessors are correctly typed ──────────────────────────
type _kind = Expect<Equal<ReturnType<typeof getToolKind>, ToolKind | undefined>>;
type _names = Expect<Equal<ReturnType<typeof getInteractiveToolNames>, string[]>>;
