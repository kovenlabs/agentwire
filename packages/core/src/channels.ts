import {
  publish,
  request,
  type RequestOptions,
  type RequestResult,
  subscribe,
} from "./event-bus.js";

/**
 * A typed channel token. The payload type `P` is carried at the type level only
 * (`__payload` is never present at runtime) so `publishTo`/`subscribeTo` can
 * enforce the right payload shape per channel.
 */
export interface Channel<P> {
  readonly name: string;
  /** Phantom field — exists only to carry `P`. Never read at runtime. */
  readonly __payload?: P;
}

export type PayloadOf<C> = C extends Channel<infer P> ? P : never;

/** Declare a typed channel. Use `chan<MyPayload>("my:channel")`. */
export function chan<P = void>(name: string): Channel<P> {
  return { name };
}

/**
 * Group a set of channel tokens into a registry. Purely an identity helper that
 * preserves the literal types — the replacement for an app's `AGENT_EVENTS`
 * object. Each app declares its own channels; the library ships none.
 */
export function defineChannels<T extends Record<string, Channel<unknown>>>(channels: T): T {
  return channels;
}

/** The conventional channel a server tool's result is published on. */
export function toolResultChannel(toolName: string): Channel<unknown> {
  return chan(`tool:${toolName}:result`);
}

/** Typed `publish` over a channel token. */
export function publishTo<P>(channel: Channel<P>, payload: P): void {
  publish(channel.name, payload);
}

/** Typed `subscribe` over a channel token. */
export function subscribeTo<P>(channel: Channel<P>, handler: (payload: P) => void): () => void {
  return subscribe<P>(channel.name, handler);
}

/** Typed `request` over a request/reply pair of channel tokens. */
export function requestVia<R, P>(
  requestChannel: Channel<P>,
  replyChannel: Channel<R>,
  payload: P,
  opts?: RequestOptions<R>,
): Promise<RequestResult<R>> {
  return request<R, P>(requestChannel.name, replyChannel.name, payload, opts);
}
