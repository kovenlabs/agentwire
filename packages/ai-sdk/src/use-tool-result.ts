"use client";

import { toolResultChannel } from "@kovenlabs/agentwire";
import { useSubscribe } from "@kovenlabs/agentwire-react";
import { useState } from "react";

/**
 * Subscribe to a **server** tool's result from anywhere — the off-chat
 * counterpart to {@link useInteractiveResult}. Server tools run by `useAgentChat`
 * auto-publish on `tool:<name>:result`; this hides that channel-name convention
 * and the cast behind a typed handler.
 *
 * ```tsx
 * useToolResult<Flight[]>("searchFlights", (flights) => setFlights(flights));
 * ```
 *
 * A thin adapter over {@link useSubscribe}. `toolResultChannel(toolName)` yields a
 * fresh token each render, but it keys on the (stable) channel name, so the
 * subscription is set up once and rebuilt only when `toolName` changes.
 */
export function useToolResult<T = unknown>(
  toolName: string,
  handler: (output: T) => void,
): void {
  useSubscribe(toolResultChannel(toolName), (output) => handler(output as T));
}

/**
 * State-returning variant of {@link useToolResult}: returns the latest result for
 * `toolName` (or `null` before the first), so consumers skip the `useState` +
 * setter boilerplate.
 *
 * ```tsx
 * const flights = useToolResultState<Flight[]>("searchFlights");
 * ```
 */
export function useToolResultState<T = unknown>(toolName: string): T | null {
  const [value, setValue] = useState<T | null>(null);
  useToolResult<T>(toolName, (output) => setValue(output));
  return value;
}
