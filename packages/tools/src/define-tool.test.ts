import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool } from "./define-tool.js";
import {
  _resetRegistryForTesting,
  getInteractiveToolNames,
  getToolDisplay,
  getToolKind,
} from "./registry.js";

afterEach(() => _resetRegistryForTesting());

describe("defineTool", () => {
  it("creates a server tool with execute and registers kind + display", async () => {
    const tool = defineTool.server({
      name: "generateTemplate",
      description: "Generate a template",
      label: "Generating template",
      inputSchema: z.object({ pageId: z.string() }),
      execute: async ({ pageId }) => ({ pageId, ok: true }),
    });

    expect(tool.kind).toBe("server");
    expect(tool.execute).toBeTypeOf("function");
    await expect(tool.execute?.({ pageId: "p1" })).resolves.toEqual({ pageId: "p1", ok: true });
    expect(getToolKind("generateTemplate")).toBe("server");
    expect(getToolDisplay("generateTemplate")).toEqual({ label: "Generating template" });
  });

  it("creates an approval tool with needsApproval + a description on the card", () => {
    const tool = defineTool.approval({
      name: "activatePage",
      description: "Make this page live to the public.",
      label: "Activating page",
      inputSchema: z.object({ pageId: z.string() }),
      execute: () => ({ ok: true }),
    });

    expect(tool.kind).toBe("approval");
    expect(tool.needsApproval).toBe(true);
    expect(getToolDisplay("activatePage").description).toBe("Make this page live to the public.");
  });

  it("creates client and interactive tools without execute", () => {
    const nav = defineTool.client({
      name: "navigate",
      description: "Navigate somewhere",
      label: "Navigating",
      inputSchema: z.object({ target: z.string() }),
    });
    const ask = defineTool.interactive({
      name: "askUser",
      description: "Ask the user",
      label: "Asking you",
      inputSchema: z.object({ questions: z.array(z.string()) }),
    });

    expect(nav.execute).toBeUndefined();
    expect(ask.execute).toBeUndefined();
    expect(getToolKind("navigate")).toBe("client");
    expect(getToolKind("askUser")).toBe("interactive");
  });

  it("lists interactive tool names from the registry", () => {
    defineTool.interactive({
      name: "askUser",
      description: "",
      label: "",
      inputSchema: z.object({}),
    });
    defineTool.interactive({
      name: "chooseComponent",
      description: "",
      label: "",
      inputSchema: z.object({}),
    });
    defineTool.server({
      name: "scrape",
      description: "",
      label: "",
      inputSchema: z.object({}),
      execute: () => null,
    });

    expect(getInteractiveToolNames().sort()).toEqual(["askUser", "chooseComponent"]);
  });

  it("falls back to the tool name as label when unregistered", () => {
    expect(getToolDisplay("unknown")).toEqual({ label: "unknown" });
  });
});
