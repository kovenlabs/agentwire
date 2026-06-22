import type { StandardSchemaV1 } from "@standard-schema/spec";
import { registerTool } from "./registry.js";

/**
 * - `server`      — runs `execute` on the server; result is returned to the model.
 * - `approval`    — a server tool gated behind an approve/deny step.
 * - `client`      — no `execute`; resolved by the app's tool handlers on the client.
 * - `interactive` — no `execute`; deferred to UI and settled via the bus
 *                   (answers, picks, interrupts) by the chat runtime.
 */
export type ToolKind = "server" | "approval" | "client" | "interactive";

export interface ToolDisplay {
  /** Human label shown while/after the tool runs. */
  label: string;
  /** For approval tools: sentence shown above Approve/Deny. */
  description?: string;
}

type Infer<S extends StandardSchemaV1> = StandardSchemaV1.InferOutput<S>;

export interface AgentToolDefinition<S extends StandardSchemaV1 = StandardSchemaV1> {
  name: string;
  kind: ToolKind;
  /** Description sent to the model. */
  description: string;
  inputSchema: S;
  /** Present only for `server` / `approval` tools. */
  execute?: (input: Infer<S>) => Promise<unknown> | unknown;
  needsApproval?: boolean;
  display: ToolDisplay;
}

interface BaseDef<S extends StandardSchemaV1> {
  name: string;
  description: string;
  inputSchema: S;
  label: string;
}

interface ServerDef<S extends StandardSchemaV1> extends BaseDef<S> {
  execute: (input: Infer<S>) => Promise<unknown> | unknown;
}

interface ApprovalDef<S extends StandardSchemaV1> extends ServerDef<S> {
  /** Sentence shown above Approve/Deny. */
  description: string;
  approvalDescription?: string;
}

type ClientDef<S extends StandardSchemaV1> = BaseDef<S>;

function define<S extends StandardSchemaV1>(def: AgentToolDefinition<S>): AgentToolDefinition<S> {
  registerTool(def.name, { kind: def.kind, display: def.display });
  return def;
}

/**
 * Declare an agent tool. One call produces the neutral definition AND registers
 * its kind + display metadata, so the UI and the chat runtime can look a tool up
 * by name without importing the tool module.
 */
export const defineTool = {
  server<S extends StandardSchemaV1>(def: ServerDef<S>): AgentToolDefinition<S> {
    return define({
      name: def.name,
      kind: "server",
      description: def.description,
      inputSchema: def.inputSchema,
      execute: def.execute,
      display: { label: def.label },
    });
  },

  approval<S extends StandardSchemaV1>(def: ApprovalDef<S>): AgentToolDefinition<S> {
    return define({
      name: def.name,
      kind: "approval",
      description: def.description,
      inputSchema: def.inputSchema,
      execute: def.execute,
      needsApproval: true,
      display: { label: def.label, description: def.approvalDescription ?? def.description },
    });
  },

  client<S extends StandardSchemaV1>(def: ClientDef<S>): AgentToolDefinition<S> {
    return define({
      name: def.name,
      kind: "client",
      description: def.description,
      inputSchema: def.inputSchema,
      display: { label: def.label },
    });
  },

  interactive<S extends StandardSchemaV1>(def: ClientDef<S>): AgentToolDefinition<S> {
    return define({
      name: def.name,
      kind: "interactive",
      description: def.description,
      inputSchema: def.inputSchema,
      display: { label: def.label },
    });
  },
};
