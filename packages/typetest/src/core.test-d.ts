import {
  chan,
  type Channel,
  defineChannels,
  type InteractiveResolvePayload,
  isCompletedOutput,
  isInterruptedOutput,
  type PayloadOf,
  publishTo,
  type RequestResult,
  requestVia,
  subscribeTo,
  toolResultChannel,
} from "@kovenlabs/agentwire";
import type { Equal, Expect, Extends } from "./assert.js";

// ── chan + PayloadOf ────────────────────────────────────────────────
const ping = chan<{ n: number }>("ping");
type _ping = Expect<Equal<PayloadOf<typeof ping>, { n: number }>>;
const voidChan = chan("no-payload"); // default type arg
type _void = Expect<Equal<PayloadOf<typeof voidChan>, void>>;

// ── publishTo enforces the channel's payload ────────────────────────
publishTo(ping, { n: 1 });
// @ts-expect-error wrong field type
publishTo(ping, { n: "x" });
// @ts-expect-error missing field
publishTo(ping, {});

// ── subscribeTo types the handler argument ──────────────────────────
const off = subscribeTo(ping, (p) => {
  type _p = Expect<Equal<typeof p, { n: number }>>;
});
type _off = Expect<Equal<typeof off, () => void>>;

// ── defineChannels preserves literal payload types ──────────────────
const events = defineChannels({
  request: chan<{ version: string }>("page:request"),
  reply: chan<{ values: number }>("page:reply"),
});
type _req = Expect<Equal<PayloadOf<typeof events.request>, { version: string }>>;

// ── requestVia round-trips + discriminates the result ───────────────
async function reqs() {
  const r = await requestVia(events.request, events.reply, { version: "v1" });
  type _r = Expect<Equal<typeof r, RequestResult<{ values: number }>>>;
  if (r.ok) {
    type _val = Expect<Equal<typeof r.value, { values: number }>>;
  }
  // @ts-expect-error wrong request payload
  await requestVia(events.request, events.reply, { version: 1 });
}

// ── toolResultChannel is an unknown-payload channel ─────────────────
type _trc = Expect<Equal<typeof toolResultChannel, (toolName: string) => Channel<unknown>>>;

// ── interactive guards narrow ───────────────────────────────────────
function guards(out: unknown) {
  if (isInterruptedOutput(out)) {
    type _i = Expect<Extends<typeof out, { status: "interrupted"; reason: string }>>;
  }
  if (isCompletedOutput(out)) {
    type _c = Expect<Extends<typeof out, { status: "completed" }>>;
  }
}

// ── InteractiveResolvePayload shape ─────────────────────────────────
type _resolve = Expect<Extends<InteractiveResolvePayload, { tool: string; toolCallId: string }>>;
