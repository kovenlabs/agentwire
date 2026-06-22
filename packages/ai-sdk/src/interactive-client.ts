"use client";

import {
  CHAT_ABOUT_THIS_REASON,
  type Channel,
  type InteractiveResolvePayload,
  publishTo,
} from "@kovenlabs/agentwire";
import { INTERACTIVE_RESOLVE_CHANNEL } from "./interactive-channel.js";

/**
 * Settle an interactive tool call from the UI. The chat runtime, subscribed to
 * the resolve channel, forwards `output` to the model via `addToolOutput`.
 *
 * ```ts
 * resolveInteractive("pickFlight", toolCallId, { status: "completed", flightId });
 * ```
 */
export function resolveInteractive(
  tool: string,
  toolCallId: string,
  output: unknown,
  channel: Channel<InteractiveResolvePayload> = INTERACTIVE_RESOLVE_CHANNEL,
): void {
  publishTo(channel, { tool, toolCallId, output });
}

/**
 * Settle an interactive tool call as *completed* — the common case. Sugar over
 * {@link resolveInteractive} that assembles the completed output shape:
 * `{ status: "completed", ...data }` (the mirror of {@link interruptInteractive}).
 *
 * ```ts
 * completeInteractive("pickFlight", toolCallId, { flightId });
 * ```
 */
export function completeInteractive(
  tool: string,
  toolCallId: string,
  data: Record<string, unknown> = {},
  channel: Channel<InteractiveResolvePayload> = INTERACTIVE_RESOLVE_CHANNEL,
): void {
  publishTo(channel, { tool, toolCallId, output: { status: "completed", ...data } });
}

export interface InterruptOptions {
  /** Defaults to `CHAT_ABOUT_THIS_REASON`. */
  reason?: string;
  channel?: Channel<InteractiveResolvePayload>;
}

/**
 * Settle an interactive tool call as *interrupted* — the user bailed out (e.g.
 * to chat instead of answering). Builds the standard interrupted output shape:
 * `{ status: "interrupted", reason, tool, ...extra }`.
 */
export function interruptInteractive(
  tool: string,
  toolCallId: string,
  extra: Record<string, unknown> = {},
  options: InterruptOptions = {},
): void {
  publishTo(options.channel ?? INTERACTIVE_RESOLVE_CHANNEL, {
    tool,
    toolCallId,
    output: { status: "interrupted", reason: options.reason ?? CHAT_ABOUT_THIS_REASON, tool, ...extra },
  });
}
