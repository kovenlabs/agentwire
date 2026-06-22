/**
 * Primitives for "interactive" tools — tools whose execution is deferred to the
 * client: the tool call renders UI, the user acts, and the result is published
 * back onto the bus to settle the call. An interactive call can also be
 * *interrupted* (e.g. the user chooses to chat instead of answering), which
 * settles it with an `interrupted` output the model can react to.
 *
 * These types are intentionally generic: an app supplies its own tool-name union
 * and per-tool output shapes.
 */

/** Default reason for an interrupt where the user bails out to chat. */
export const CHAT_ABOUT_THIS_REASON = "chat_about_this" as const;

/** Discriminated base for a completed interactive output. */
export interface CompletedOutputBase<TName extends string = string> {
  status: "completed";
  tool?: TName;
}

/** Discriminated base for an interrupted interactive output. */
export interface InterruptedOutputBase<TName extends string = string> {
  status: "interrupted";
  reason: string;
  tool: TName;
}

/**
 * The bus payload used to settle an interactive tool call — published by the UI
 * (an answer, a pick, or an interrupt) and consumed by the chat runtime, which
 * forwards `output` to the model via `addToolOutput`.
 */
export interface InteractiveResolvePayload<TName extends string = string, TOutput = unknown> {
  tool: TName;
  toolCallId: string;
  output: TOutput;
}

/** True when `output` is an interrupted interactive output (optionally matching `reason`). */
export function isInterruptedOutput(
  output: unknown,
  reason?: string,
): output is InterruptedOutputBase {
  if (typeof output !== "object" || output === null) return false;
  const record = output as Record<string, unknown>;
  return (
    record.status === "interrupted" &&
    typeof record.tool === "string" &&
    typeof record.reason === "string" &&
    (reason === undefined || record.reason === reason)
  );
}

/** True when `output` is a completed interactive output. */
export function isCompletedOutput(output: unknown): output is CompletedOutputBase {
  if (typeof output !== "object" || output === null) return false;
  return (output as Record<string, unknown>).status === "completed";
}
