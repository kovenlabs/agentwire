import { type AgentLogger, noopLogger, serializeError } from "@kovenlabs/agentwire";
import type { AgentToolDefinition } from "@kovenlabs/agentwire-tools";
import type { Tool, ToolSet } from "ai";

/** Request-scoped context threaded through `experimental_context` in streamText. */
export interface AgentToolContext {
  userId?: string;
  chatId?: string;
  agent?: string;
}

function toContext(context: unknown): AgentToolContext {
  if (typeof context !== "object" || context === null) return {};
  const { userId, chatId, agent } = context as Record<string, unknown>;
  return {
    ...(typeof userId === "string" && { userId }),
    ...(typeof chatId === "string" && { chatId }),
    ...(typeof agent === "string" && { agent }),
  };
}

function errorFromOutput(output: unknown): string | undefined {
  if (typeof output !== "object" || output === null || !("error" in output)) return undefined;
  const { error } = output as { error: unknown };
  return error === undefined || error === null ? undefined : String(error);
}

// Bounded JSON of the tool input, attached to failure logs so a failure can be
// tied to its arguments. Truncated so large inputs don't bloat the log.
function summarizeInput(input: unknown): string | undefined {
  try {
    const json = JSON.stringify(input);
    if (json === undefined) return undefined;
    return json.length > 1000 ? `${json.slice(0, 1000)}…` : json;
  } catch {
    return undefined;
  }
}

interface ExecOptions {
  toolCallId?: string;
  experimental_context?: unknown;
}

/**
 * Wraps a tool's `execute` with started/finished/failed logging, correlated by
 * chatId/toolCallId. The logger is injected — the library ships no concrete one.
 */
function withExecutionLogging(
  name: string,
  logger: AgentLogger,
  execute: (input: unknown) => Promise<unknown> | unknown,
): (input: unknown, options?: ExecOptions) => Promise<unknown> {
  return async (input, options) => {
    const base = {
      tool: name,
      toolCallId: options?.toolCallId,
      ...toContext(options?.experimental_context),
    };
    logger.info("agent tool started", base);
    const startedAt = Date.now();
    try {
      const output = await execute(input);
      const durationMs = Date.now() - startedAt;
      // Some tools catch internally and return { error } as a normal output so
      // the model can react — log those as failures too.
      const returnedError = errorFromOutput(output);
      if (returnedError !== undefined) {
        logger.error("agent tool failed", {
          ...base,
          durationMs,
          thrown: false,
          error: returnedError,
          input: summarizeInput(input),
        });
      } else {
        logger.info("agent tool finished", { ...base, durationMs });
      }
      return output;
    } catch (error) {
      logger.error("agent tool failed", {
        ...base,
        durationMs: Date.now() - startedAt,
        thrown: true,
        error: serializeError(error),
        input: summarizeInput(input),
      });
      throw error;
    }
  };
}

export interface ToAiToolOptions {
  logger?: AgentLogger;
}

/**
 * Convert a neutral {@link AgentToolDefinition} into a Vercel AI SDK `Tool`.
 *
 * - `server`/`approval` tools get their `execute` wrapped with logging;
 *   `approval` tools also carry `needsApproval`.
 * - `client`/`interactive` tools are emitted without `execute` (the model still
 *   sees them; the client settles the call).
 */
// biome-ignore lint/suspicious/noExplicitAny: accept a tool of any input schema —
// a concrete AgentToolDefinition<ZodObject<…>> is not assignable to the default
// generic because `execute`'s parameter is contravariant.
export function toAiTool(def: AgentToolDefinition<any>, options: ToAiToolOptions = {}): Tool {
  const logger = options.logger ?? noopLogger;
  const base = {
    description: def.description,
    inputSchema: def.inputSchema,
  } as Record<string, unknown>;

  if (def.execute) {
    base.execute = withExecutionLogging(def.name, logger, def.execute as (i: unknown) => unknown);
  }
  if (def.needsApproval) {
    base.needsApproval = true;
  }
  return base as unknown as Tool;
}

/** Convert a record of definitions into a `ToolSet` keyed by tool name. */
export function toAiToolSet(
  // biome-ignore lint/suspicious/noExplicitAny: tools may have differing input schemas
  defs: Record<string, AgentToolDefinition<any>>,
  options: ToAiToolOptions = {},
): ToolSet {
  const set: Record<string, Tool> = {};
  for (const [name, def] of Object.entries(defs)) {
    set[name] = toAiTool(def, options);
  }
  return set as ToolSet;
}
