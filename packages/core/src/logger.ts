/**
 * Pluggable logging + telemetry seams. The library never imports a concrete
 * logger (no PostHog, no pino) — apps inject an implementation, or accept the
 * no-op / console defaults.
 */

export type AgentLogContext = Record<string, unknown>;

export interface AgentLogger {
  info(message: string, context?: AgentLogContext): void;
  error(message: string, context?: AgentLogContext): void;
}

export const noopLogger: AgentLogger = {
  info() {},
  error() {},
};

export const consoleLogger: AgentLogger = {
  info: (message, context) => console.info(`[agentwire] ${message}`, context ?? ""),
  error: (message, context) => console.error(`[agentwire] ${message}`, context ?? ""),
};

export interface AgentTelemetryEvent {
  tool: string;
  toolCallId: string;
  outcome: "ok" | "error" | "no-op";
  durationMs: number;
  [key: string]: unknown;
}

export interface AgentTelemetry {
  capture(event: AgentTelemetryEvent): void;
}

export const noopTelemetry: AgentTelemetry = {
  capture() {},
};

/** Best-effort error → string, safe for log payloads. */
export function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ? `${error.name}: ${error.message}\n${error.stack}` : `${error.name}: ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
