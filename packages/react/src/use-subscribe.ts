import { type Channel, subscribeTo } from "@kovenlabs/agentwire";
import { useEffect, useRef } from "react";

/**
 * Subscribe to a channel for the lifetime of the component. The handler is held
 * in a ref so an inline closure doesn't re-subscribe on every render — the
 * subscription is keyed only on the channel name.
 */
export function useSubscribe<P>(channel: Channel<P>, handler: (payload: P) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    return subscribeTo(channel, (payload) => ref.current(payload));
  }, [channel.name]);
}
