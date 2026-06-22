import { type Channel, chan, type InteractiveResolvePayload } from "@kovenlabs/agentwire";

/** Default channel the UI publishes interactive results/interrupts on. */
export const INTERACTIVE_RESOLVE_CHANNEL: Channel<InteractiveResolvePayload> = chan(
  "agentwire:interactive:resolve",
);
