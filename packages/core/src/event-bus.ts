/**
 * A tiny synchronous in-memory pub/sub bus.
 *
 * Handlers are invoked immediately and in registration order. There is no
 * persistence and no cross-process delivery — this is a same-runtime bridge
 * (e.g. server tool completion → client UI, or form editor ↔ agent tool).
 */

type Handler<P> = (payload: P) => void;

const channels = new Map<string, Set<Handler<unknown>>>();

/** Broadcast `payload` to every subscriber currently on `channel`. */
export function publish<P>(channel: string, payload: P): void {
  const set = channels.get(channel);
  if (!set) return;
  // Snapshot so a handler that (un)subscribes during dispatch can't mutate the
  // set we're iterating.
  for (const handler of [...set]) {
    (handler as Handler<P>)(payload);
  }
}

/** Listen on `channel`. Returns an unsubscribe function. */
export function subscribe<P>(channel: string, handler: Handler<P>): () => void {
  let set = channels.get(channel);
  if (!set) {
    set = new Set();
    channels.set(channel, set);
  }
  set.add(handler as Handler<unknown>);
  return () => {
    set?.delete(handler as Handler<unknown>);
  };
}

export interface RequestOptions<R> {
  timeoutMs?: number;
  /** Reply is accepted only when this returns true. Other replies are ignored (not consumed). */
  filter?: (reply: R) => boolean;
}

export type RequestResult<R> = { ok: true; value: R } | { ok: false };

/**
 * Publish on `requestChannel` and resolve with the first reply on `replyChannel`
 * that passes the optional filter. Resolves `{ ok: false }` after `timeoutMs`
 * (default 2000).
 */
export function request<R, P = unknown>(
  requestChannel: string,
  replyChannel: string,
  payload: P,
  opts: RequestOptions<R> = {},
): Promise<RequestResult<R>> {
  const { timeoutMs = 2000, filter } = opts;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: RequestResult<R>) => {
      if (settled) return;
      settled = true;
      off();
      clearTimeout(timer);
      resolve(result);
    };
    const off = subscribe<R>(replyChannel, (reply) => {
      if (filter && !filter(reply)) return;
      finish({ ok: true, value: reply });
    });
    const timer = setTimeout(() => finish({ ok: false }), timeoutMs);
    publish(requestChannel, payload);
  });
}

/** Test-only — clears every channel and subscriber. */
export function _resetForTesting(): void {
  channels.clear();
}
