"use client";

import {
  AgentMessages,
  renderMessageParts,
  type ToolPartSlots,
  useAgentChat,
} from "@kovenlabs/agentwire-ai-sdk/react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { FlightGallery } from "./flight-gallery";
import { PassengerForm } from "./passenger-form";
import { TripPanel } from "./trip-panel";

// Add a row here per interactive tool — nothing else changes.
const INTERACTIVE = {
  pickFlight: FlightGallery,
  collectPassenger: PassengerForm,
};

const SUGGESTIONS = [
  "Find me a flight from Lisbon to Tokyo on Dec 3",
  "Cheapest flight NYC → London next Friday",
  "Book a flight to Paris",
];

export function Atlas() {
  const [chatId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"managed" | "custom">("managed");

  const chat = useAgentChat({
    chatId,
    agent: "atlas",
    api: "/api/chat",
    toolHandlers: {
      showToast: (call, addToolOutput) => {
        toast.success((call.input as { message: string }).message);
        addToolOutput({ tool: "showToast", toolCallId: call.toolCallId, output: { shown: true } });
      },
    },
  });

  // Custom render slots — proves AgentMessages is fully themeable.
  const slots: ToolPartSlots = {
    text: (t) => <p className="leading-relaxed">{t}</p>,
    status: ({ label }) => (
      <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
        <span className="flex gap-1">
          <i className="size-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
          <i className="size-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
          <i className="size-1.5 animate-bounce rounded-full bg-indigo-400" />
        </span>
        {label}…
      </span>
    ),
    output: ({ toolName, output }) => {
      if (toolName === "searchFlights") {
        return (
          <span className="w-fit rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
            Found {(output as unknown[]).length} flights
          </span>
        );
      }
      // The chosen interactive option, shown in place of the gallery once picked.
      if (toolName === "pickFlight") {
        const o = output as { flightId?: string; airline?: string; price?: number };
        if (!o.flightId) return null; // interrupted → nothing to show
        return (
          <span className="w-fit rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            ✈ Chosen · {o.airline} {o.flightId} · ${o.price}
          </span>
        );
      }
      if (toolName === "collectPassenger") {
        return (
          <span className="w-fit rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
            ✓ Passenger details added
          </span>
        );
      }
      if (toolName === "bookFlight") {
        const o = output as { confirmation?: string };
        return o.confirmation ? (
          <span className="w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
            ✓ Booked · {o.confirmation}
          </span>
        ) : null;
      }
      return null;
    },
    approval: ({ description, input, respond }) => (
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-indigo-500/40 bg-zinc-900 p-4">
        <div className="flex items-center gap-2 font-semibold">🔒 Confirm booking</div>
        <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(input as Record<string, unknown>).map(([k, v]) => (
            <span
              key={k}
              className="rounded-md border border-zinc-800 bg-zinc-800/60 px-2 py-1 font-mono text-xs text-zinc-400"
            >
              {k}: {String(v)}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => respond(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            Approve & book
          </button>
          <button
            type="button"
            onClick={() => respond(false)}
            className="rounded-xl border border-zinc-800 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-400 transition hover:text-zinc-100"
          >
            Deny
          </button>
        </div>
      </div>
    ),
  };

  const busy = chat.status === "streaming" || chat.status === "submitted";

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    chat.sendMessage({ text });
    setInput("");
  };

  const wrap = (m: { role: string; id: string }, parts: ReactNode) => (
    <div key={m.id} className={`flex animate-rise gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
      <div
        className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm ${
          m.role === "user" ? "bg-zinc-800 text-zinc-400" : "bg-indigo-600"
        }`}
      >
        {m.role === "user" ? "Y" : "✈"}
      </div>
      <div className={`flex min-w-0 max-w-[82%] flex-col gap-2 ${m.role === "user" ? "items-end" : ""}`}>
        {parts}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl gap-6 px-4">
      <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-xl">✈</div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Atlas</h1>
            <p className="text-xs text-zinc-500">Flight booking · built with agentwire</p>
          </div>
        </div>
        <div className="flex gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
          {(["managed", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-2.5 py-1.5 font-mono text-xs transition ${
                mode === m ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {m === "managed" ? "<AgentMessages>" : "renderMessageParts"}
            </button>
          ))}
        </div>
      </header>

      <div className="thread flex flex-1 flex-col gap-5 overflow-y-auto py-2">
        {chat.messages.length === 0 && (
          <div className="m-auto flex flex-col items-center gap-5 text-center">
            <div className="text-2xl font-semibold text-indigo-400">Where are we flying?</div>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "managed" ? (
          <AgentMessages chat={chat} interactive={INTERACTIVE} slots={slots} renderMessage={wrap} />
        ) : (
          chat.messages.map((m) =>
            wrap(
              m,
              renderMessageParts(m, {
                interactive: INTERACTIVE,
                addToolApprovalResponse: chat.addToolApprovalResponse,
                slots,
              }),
            ),
          )
        )}
      </div>

      <form
        className="sticky bottom-0 flex items-center gap-2.5 bg-zinc-950 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Atlas…"
          disabled={busy}
          className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-[15px] outline-none transition placeholder:text-zinc-600 focus:border-indigo-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Send"
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-lg text-white transition hover:bg-indigo-500 active:scale-95 disabled:opacity-40"
        >
          {busy ? "·" : "↑"}
        </button>
      </form>
      </div>

      <aside className="hidden w-72 shrink-0 py-4 lg:block">
        <TripPanel />
      </aside>
    </div>
  );
}
