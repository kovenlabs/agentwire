import { chan, type Channel, type RequestResult } from "@kovenlabs/agentwire";
import { toAiTool, toAiToolSet } from "@kovenlabs/agentwire-ai-sdk";
import {
  AgentMessages,
  INTERACTIVE_RESOLVE_CHANNEL,
  type InteractiveRegistry,
  interruptInteractive,
  resolveInteractive,
  type UseAgentChatOptions,
  useInteractiveResult,
  useInteractiveResultState,
  useToolResult,
  useToolResultState,
} from "@kovenlabs/agentwire-ai-sdk/react";
import { type FormBridgeAdapter, useFormBridge, useRequest } from "@kovenlabs/agentwire-react";
import { defineTool } from "@kovenlabs/agentwire-tools";
import { z } from "zod";
import type { Equal, Expect } from "./assert.js";

// ── ai-sdk: a concretely-typed tool is accepted by the converters. This is
//    the regression the converters previously failed: a tool whose schema is
//    `ZodObject<{ url }>` was not assignable to the default generic. ───────
const tool = defineTool.server({
  name: "scrape",
  description: "",
  label: "Scraping",
  inputSchema: z.object({ url: z.string() }),
  execute: () => null,
});
void toAiTool(tool);
void toAiToolSet({ scrape: tool });
// @ts-expect-error a plain object is not a tool definition
void toAiTool({ nope: true });

// ── ai-sdk/react: resolve channel + options ─────────────────────────
type _resolveChan = Expect<
  Equal<typeof INTERACTIVE_RESOLVE_CHANNEL, Channel<import("@kovenlabs/agentwire").InteractiveResolvePayload>>
>;

const opts: UseAgentChatOptions = {
  chatId: "c",
  agent: "page_builder",
  interactiveTools: ["askUser"],
  terminalTools: ["suggestFollowUps"],
  toolHandlers: {
    navigate: (call, addToolOutput) => {
      // call is typed: { toolName, toolCallId, input }
      type _name = Expect<Equal<typeof call.toolName, string>>;
      type _input = Expect<Equal<typeof call.input, unknown>>;
      addToolOutput({ tool: "navigate", toolCallId: call.toolCallId, output: { ok: true } });
    },
  },
};
void opts;

// @ts-expect-error chatId is required
const bad: UseAgentChatOptions = { agent: "x" };
void bad;

// ── ai-sdk/react: interactive resolve helpers + message renderer ────
resolveInteractive("pickFlight", "call-1", { status: "completed", flightId: "BA1" });
interruptInteractive("pickFlight", "call-1");
interruptInteractive("pickFlight", "call-1", { scope: "gallery" }, { reason: "chat_about_this" });

// useInteractiveResult: handler output is typed by the type arg; payload typed too
useInteractiveResult<{ flightId: string }>("pickFlight", (output, payload) => {
  type _out = Expect<Equal<typeof output, { flightId: string }>>;
  type _pl = Expect<Equal<typeof payload.tool, string>>;
});
useInteractiveResult("askUser", () => {}, { includeInterrupts: true });

// useToolResult: handler output typed by the type arg
useToolResult<{ id: string }[]>("searchFlights", (results) => {
  type _r = Expect<Equal<typeof results, { id: string }[]>>;
});

// state variants: return `T | null`
const flightState = useInteractiveResultState<{ flightId: string }>("pickFlight");
type _isv = Expect<Equal<typeof flightState, { flightId: string } | null>>;
const toolState = useToolResultState<number[]>("searchFlights");
type _tsv = Expect<Equal<typeof toolState, number[] | null>>;

const registry: InteractiveRegistry = {
  pickFlight: ({ toolCallId, input }) => {
    type _id = Expect<Equal<typeof toolCallId, string>>;
    void input;
    return null;
  },
};
void registry;
void AgentMessages;

// ── react: useRequest returns a typed send function ─────────────────
declare const reqC: Channel<{ q: string }>;
declare const repC: Channel<{ a: number }>;
const send = useRequest(reqC, repC);
async function useSend() {
  const r = await send({ q: "hi" });
  type _send = Expect<Equal<typeof r, RequestResult<{ a: number }>>>;
  // @ts-expect-error wrong request payload
  await send({ q: 1 });
}

// ── react: useFormBridge infers its generic payloads ────────────────
declare const adapter: FormBridgeAdapter;
useFormBridge({
  adapter,
  channels: {
    request: chan<{ version: string }>("req"),
    current: chan<Record<string, unknown>>("cur"),
    update: chan<{ path: string; value: unknown }>("upd"),
  },
  toCurrent: (values) => {
    type _values = Expect<Equal<typeof values, Record<string, unknown>>>;
    return values;
  },
  toUpdate: (payload) => {
    type _payload = Expect<Equal<typeof payload, { path: string; value: unknown }>>;
    return { path: payload.path, value: payload.value };
  },
});
