"use client";

import {
  type AgentLogger,
  type AgentTelemetry,
  type Channel,
  type InteractiveResolvePayload,
  noopLogger,
  noopTelemetry,
  publish,
  toolResultChannel,
} from "@kovenlabs/agentwire";
import { useSubscribe } from "@kovenlabs/agentwire-react";
import { getInteractiveToolNames } from "@kovenlabs/agentwire-tools";
import { INTERACTIVE_RESOLVE_CHANNEL } from "./interactive-channel.js";
import { useChat } from "@ai-sdk/react";
import * as AiSdk from "ai";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useEffect, useMemo, useRef } from "react";

// Present in ai@6+, absent in ai@5. Accessed defensively so the package supports
// both (peer range `^5 || ^6`); on v5 there are simply no approval responses to
// auto-continue after.
const isCompleteWithApprovalResponses = (
  AiSdk as Record<string, unknown>
).lastAssistantMessageIsCompleteWithApprovalResponses as
  | ((params: { messages: UIMessage[] }) => boolean)
  | undefined;

export interface AddToolOutputArgs {
  tool: string;
  toolCallId: string;
  output: unknown;
}
export type AddToolOutput = (args: AddToolOutputArgs) => void;

export type ToolHandler = (
  toolCall: { toolName: string; toolCallId: string; input: unknown },
  addToolOutput: AddToolOutput,
) => void | Promise<void>;

export interface UseAgentChatOptions {
  chatId: string;
  agent?: string;
  /** Chat endpoint. Default `/api/agent/chat`. */
  api?: string;
  initialMessages?: UIMessage[];
  /**
   * Client tools you resolve yourself (navigate, showBanner, …). Checked before
   * the interactive-tool path. Each handler calls `addToolOutput` to settle.
   */
  toolHandlers?: Record<string, ToolHandler>;
  /**
   * Tools deferred to UI and settled via the bus. Defaults to every tool
   * registered with `defineTool.interactive`.
   */
  interactiveTools?: string[];
  /** Channel the UI publishes interactive results/interrupts on. */
  resolveChannel?: Channel<InteractiveResolvePayload>;
  /** Tools that end the turn — auto-continuation is suppressed after them. */
  terminalTools?: string[];
  /** Publish `tool:<name>:result` when a server tool completes. Default true. */
  publishServerToolResults?: boolean;
  /** Sanitize history-loaded messages (e.g. close dangling tool calls). */
  onDanglingToolCalls?: (messages: UIMessage[]) => UIMessage[];
  logger?: AgentLogger;
  telemetry?: AgentTelemetry;
}

function lastAssistantHasTerminalTool(messages: UIMessage[], terminal: Set<string>): boolean {
  if (terminal.size === 0) return false;
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return false;
  return last.parts.some((p) => {
    if ("toolName" in p && typeof (p as { toolName?: string }).toolName === "string") {
      return terminal.has((p as { toolName: string }).toolName);
    }
    return typeof p.type === "string" && p.type.startsWith("tool-")
      ? terminal.has(p.type.slice("tool-".length))
      : false;
  });
}

/**
 * The reusable chat runtime: wires the AI SDK's `useChat` to the agentwire bus.
 *
 * - resolves interactive tool calls (askUser-style) from a single bus channel,
 *   deduped by `toolCallId`, for both live and history-loaded calls;
 * - dispatches client tools to your `toolHandlers`;
 * - publishes `tool:<name>:result` when server tools complete (seeded on load so
 *   already-settled history calls don't re-fire side effects);
 * - suppresses auto-continuation after terminal tools.
 */
export function useAgentChat(options: UseAgentChatOptions) {
  const {
    chatId,
    agent = "orchestrator",
    api = "/api/agent/chat",
    initialMessages,
    publishServerToolResults = true,
  } = options;

  const optsRef = useRef(options);
  optsRef.current = options;

  const interactiveSet = useMemo(
    () => new Set(options.interactiveTools ?? getInteractiveToolNames()),
    [options.interactiveTools],
  );
  const terminalSet = useMemo(() => new Set(options.terminalTools ?? []), [options.terminalTools]);
  const resolveChannel = options.resolveChannel ?? INTERACTIVE_RESOLVE_CHANNEL;

  const transport = useMemo(
    () => new DefaultChatTransport({ api, body: () => ({ chatId, agent }) }),
    [api, chatId, agent],
  );

  const loadedMessages = useMemo(
    () =>
      initialMessages && optsRef.current.onDanglingToolCalls
        ? optsRef.current.onDanglingToolCalls(initialMessages)
        : initialMessages,
    [initialMessages],
  );

  // addToolOutput is captured in a ref so the onToolCall/bus closures always see
  // the latest binding.
  const addToolOutputRef = useRef<AddToolOutput>(() => {});

  const chatReturn = useChat({
    id: chatId,
    messages: loadedMessages,
    transport,
    experimental_throttle: 50,
    sendAutomaticallyWhen: (params) => {
      if (lastAssistantHasTerminalTool(params.messages, terminalSet)) return false;
      return (
        lastAssistantMessageIsCompleteWithToolCalls(params) ||
        (isCompleteWithApprovalResponses?.(params) ?? false)
      );
    },
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic) return;
      const addToolOutput = addToolOutputRef.current;

      const handler = optsRef.current.toolHandlers?.[toolCall.toolName];
      if (handler) {
        await handler(
          {
            toolName: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            input: toolCall.input,
          },
          addToolOutput,
        );
        return;
      }

      // Interactive tools are settled by the bus listener below (works for live
      // and history-loaded calls), so leave the call open here.
      if (interactiveSet.has(toolCall.toolName)) return;
    },
  });

  addToolOutputRef.current = chatReturn.addToolOutput as AddToolOutput;

  // Settle interactive tool calls from the bus, deduped by toolCallId.
  const resolved = useRef(new Set<string>());
  useSubscribe(resolveChannel, (payload) => {
    if (resolved.current.has(payload.toolCallId)) return;
    resolved.current.add(payload.toolCallId);
    addToolOutputRef.current({
      tool: payload.tool,
      toolCallId: payload.toolCallId,
      output: payload.output,
    });
    (optsRef.current.telemetry ?? noopTelemetry).capture({
      tool: payload.tool,
      toolCallId: payload.toolCallId,
      outcome: "ok",
      durationMs: 0,
    });
  });

  // Publish tool-completion events for server-executed results. Seed existing
  // tool calls on first run WITHOUT publishing — those side effects already
  // happened in the original session.
  const dispatched = useRef(new Set<string>());
  const seeded = useRef(false);
  useEffect(() => {
    if (!publishServerToolResults) return;
    const isSeeding = !seeded.current;
    for (const msg of chatReturn.messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (typeof part.type !== "string" || !part.type.startsWith("tool-")) continue;
        const state = "state" in part ? (part as { state?: string }).state : undefined;
        const toolCallId =
          "toolCallId" in part ? (part as { toolCallId?: string }).toolCallId : undefined;
        if (state !== "output-available" || !toolCallId || dispatched.current.has(toolCallId)) {
          continue;
        }
        dispatched.current.add(toolCallId);
        if (isSeeding) continue;
        const toolName =
          "toolName" in part
            ? (part as { toolName?: string }).toolName
            : part.type.slice("tool-".length);
        const output = "output" in part ? (part as { output?: unknown }).output : undefined;
        publish(toolResultChannel(toolName ?? "").name, output);
      }
    }
    seeded.current = true;
  }, [chatReturn.messages, publishServerToolResults]);

  // Mark logger as used (reserved for future per-call client logging) without
  // pulling it into every render path.
  void (optsRef.current.logger ?? noopLogger);

  return chatReturn;
}
