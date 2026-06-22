import type { ToolDisplay, ToolKind } from "./define-tool.js";

/**
 * Process-wide registries of tool kind + display, keyed by tool name. Populated
 * as a side effect of `defineTool.*`. The chat runtime reads kinds (which tools
 * are interactive); the UI reads display (label/description) — both by name,
 * without importing the tool's module.
 */

interface ToolMeta {
  kind: ToolKind;
  display: ToolDisplay;
}

const registry = new Map<string, ToolMeta>();

export function registerTool(name: string, meta: ToolMeta): void {
  registry.set(name, meta);
}

export function getToolKind(name: string): ToolKind | undefined {
  return registry.get(name)?.kind;
}

export function getToolDisplay(name: string): ToolDisplay {
  return registry.get(name)?.display ?? { label: name };
}

/** Names of every tool registered with the `interactive` kind. */
export function getInteractiveToolNames(): string[] {
  const names: string[] = [];
  for (const [name, meta] of registry) {
    if (meta.kind === "interactive") names.push(name);
  }
  return names;
}

/** Test-only — clears the registry. */
export function _resetRegistryForTesting(): void {
  registry.clear();
}
