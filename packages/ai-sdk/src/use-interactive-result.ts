"use client";

import { type Channel, type InteractiveResolvePayload, isInterruptedOutput } from "@kovenlabs/agentwire";
import { useSubscribe } from "@kovenlabs/agentwire-react";
import { useState } from "react";
import { INTERACTIVE_RESOLVE_CHANNEL } from "./interactive-channel.js";

export interface UseInteractiveResultOptions {
  /** Also fire for interrupted resolutions (user bailed to chat). Default: false. */
  includeInterrupts?: boolean;
  /** Resolve channel to listen on. Defaults to `INTERACTIVE_RESOLVE_CHANNEL`. */
  channel?: Channel<InteractiveResolvePayload>;
}

/**
 * Subscribe to one interactive tool's resolutions from anywhere — no chat, no
 * manual `payload.tool === name` check, no interrupt filtering. The handler fires
 * with the typed `output` whenever that tool is settled.
 *
 * ```tsx
 * useInteractiveResult<{ flightId: string; price: number }>("pickFlight", (flight) => {
 *   setSelected(flight);
 * });
 * ```
 *
 * A thin adapter over {@link useSubscribe}: the filter/transform live in the
 * handler closure, so the subscription mechanism (and its ref-stability) has a
 * single home, and changing `toolName`/`includeInterrupts` never resubscribes.
 * Interrupted resolutions are skipped by default (pass `includeInterrupts`).
 */
export function useInteractiveResult<T = unknown>(
  toolName: string,
  handler: (output: T, payload: InteractiveResolvePayload) => void,
  options: UseInteractiveResultOptions = {},
): void {
  const includeInterrupts = options.includeInterrupts ?? false;
  useSubscribe(options.channel ?? INTERACTIVE_RESOLVE_CHANNEL, (payload) => {
    if (payload.tool !== toolName) return;
    if (!includeInterrupts && isInterruptedOutput(payload.output)) return;
    handler(payload.output as T, payload);
  });
}

/**
 * State-returning variant of {@link useInteractiveResult}: returns the latest
 * resolution output for `toolName` (or `null` before the first), so consumers
 * skip the `useState` + setter boilerplate.
 *
 * ```tsx
 * const flight = useInteractiveResultState<{ flightId: string }>("pickFlight");
 * ```
 */
export function useInteractiveResultState<T = unknown>(
  toolName: string,
  options: UseInteractiveResultOptions = {},
): T | null {
  const [value, setValue] = useState<T | null>(null);
  useInteractiveResult<T>(toolName, (output) => setValue(output), options);
  return value;
}
