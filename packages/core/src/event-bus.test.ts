import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chan,
  defineChannels,
  publishTo,
  requestVia,
  subscribeTo,
  toolResultChannel,
} from "./channels.js";
import { _resetForTesting, publish, request, subscribe } from "./event-bus.js";
import { isCompletedOutput, isInterruptedOutput } from "./interactive.js";

afterEach(() => {
  _resetForTesting();
  vi.useRealTimers();
});

describe("event-bus", () => {
  it("delivers a published payload to all subscribers", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribe("c", a);
    subscribe("c", b);
    publish("c", 42);
    expect(a).toHaveBeenCalledWith(42);
    expect(b).toHaveBeenCalledWith(42);
  });

  it("stops delivering after unsubscribe", () => {
    const handler = vi.fn();
    const off = subscribe("c", handler);
    off();
    publish("c", 1);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not throw when publishing to a channel with no subscribers", () => {
    expect(() => publish("empty", 1)).not.toThrow();
  });

  it("tolerates a handler unsubscribing during dispatch", () => {
    const calls: string[] = [];
    const off2 = subscribe("c", () => {
      calls.push("a");
      off2();
    });
    subscribe("c", () => calls.push("b"));
    publish("c", null);
    expect(calls).toEqual(["a", "b"]);
  });
});

describe("request/reply", () => {
  it("resolves with the first matching reply", async () => {
    subscribe("reply", () => {});
    const p = request<number>("req", "reply", { q: 1 });
    publish("reply", 7);
    await expect(p).resolves.toEqual({ ok: true, value: 7 });
  });

  it("ignores replies rejected by the filter", async () => {
    const p = request<number>("req", "reply", null, { filter: (r) => r > 5 });
    publish("reply", 1);
    publish("reply", 9);
    await expect(p).resolves.toEqual({ ok: true, value: 9 });
  });

  it("times out to { ok: false }", async () => {
    vi.useFakeTimers();
    const p = request("req", "reply", null, { timeoutMs: 1000 });
    vi.advanceTimersByTime(1000);
    await expect(p).resolves.toEqual({ ok: false });
  });
});

describe("typed channels", () => {
  const events = defineChannels({
    ping: chan<{ n: number }>("ping"),
    pong: chan<{ n: number }>("pong"),
  });

  it("publishes and subscribes with payload types", () => {
    const handler = vi.fn();
    subscribeTo(events.ping, handler);
    publishTo(events.ping, { n: 3 });
    expect(handler).toHaveBeenCalledWith({ n: 3 });
  });

  it("supports typed request/reply", async () => {
    const p = requestVia(events.ping, events.pong, { n: 1 });
    publishTo(events.pong, { n: 2 });
    await expect(p).resolves.toEqual({ ok: true, value: { n: 2 } });
  });

  it("builds a conventional tool-result channel name", () => {
    expect(toolResultChannel("generateTemplate").name).toBe("tool:generateTemplate:result");
  });
});

describe("interactive guards", () => {
  it("detects interrupted outputs and matches reason", () => {
    const out = { status: "interrupted", reason: "chat_about_this", tool: "askUser" };
    expect(isInterruptedOutput(out)).toBe(true);
    expect(isInterruptedOutput(out, "chat_about_this")).toBe(true);
    expect(isInterruptedOutput(out, "other")).toBe(false);
    expect(isInterruptedOutput({ status: "completed" })).toBe(false);
  });

  it("detects completed outputs", () => {
    expect(isCompletedOutput({ status: "completed", answers: [] })).toBe(true);
    expect(isCompletedOutput(null)).toBe(false);
  });
});
