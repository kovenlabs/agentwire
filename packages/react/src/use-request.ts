import { type Channel, type RequestOptions, type RequestResult, requestVia } from "@kovenlabs/agentwire";
import { useCallback } from "react";

/**
 * Returns a stable function that performs a typed request/reply round-trip over
 * the bus and resolves with the first matching reply (or `{ ok: false }` on
 * timeout).
 */
export function useRequest<R, P>(
  requestChannel: Channel<P>,
  replyChannel: Channel<R>,
  defaultOpts?: RequestOptions<R>,
): (payload: P, opts?: RequestOptions<R>) => Promise<RequestResult<R>> {
  return useCallback(
    (payload: P, opts?: RequestOptions<R>) =>
      requestVia(requestChannel, replyChannel, payload, { ...defaultOpts, ...opts }),
    [requestChannel.name, replyChannel.name],
  );
}
