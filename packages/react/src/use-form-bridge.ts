import { type Channel, publishTo } from "@kovenlabs/agentwire";
import { useSubscribe } from "./use-subscribe.js";

/**
 * Minimal form interface the bridge needs. Wrap react-hook-form, Formik, or
 * plain state — the bridge never imports a form library.
 */
export interface FormBridgeAdapter {
  getValues(): Record<string, unknown>;
  setValue(path: string, value: unknown): void;
}

export interface UseFormBridgeOptions<Req, Cur, Upd> {
  adapter: FormBridgeAdapter;
  channels: {
    /** Agent asks for current values. */
    request: Channel<Req>;
    /** This editor replies with current values. */
    current: Channel<Cur>;
    /** Agent pushes a field update. */
    update: Channel<Upd>;
  };
  /**
   * Return true if a request/update targets this editor instance. Use when
   * several editors are mounted at once (e.g. one per template version).
   * Defaults to always true.
   */
  match?: (payload: Req | Upd) => boolean;
  /** Build the reply payload from current form values. */
  toCurrent: (values: Record<string, unknown>) => Cur;
  /** Extract the field path + value to set from an update payload. */
  toUpdate: (payload: Upd) => { path: string; value: unknown };
}

/**
 * Bridges a form editor with an agent's "read current values" / "update a field"
 * tools over the bus. Generalized from zinpage's `useAgentFormBridge`: on a
 * request it replies with the form's values; on an update it sets a field. Pure
 * frontend — the user still saves.
 */
export function useFormBridge<Req, Cur, Upd>(options: UseFormBridgeOptions<Req, Cur, Upd>): void {
  const { adapter, channels, match, toCurrent, toUpdate } = options;
  const matches = (payload: Req | Upd) => (match ? match(payload) : true);

  // On a request, reply with the form's current values…
  useSubscribe(channels.request, (payload) => {
    if (!matches(payload)) return;
    publishTo<Cur>(channels.current, toCurrent(adapter.getValues()));
  });

  // …on an update, set the field. `useSubscribe` holds each handler in a ref, so
  // these closures stay fresh without the bespoke ref/effect dance.
  useSubscribe(channels.update, (payload) => {
    if (!matches(payload)) return;
    const { path, value } = toUpdate(payload);
    adapter.setValue(path, value);
  });
}
