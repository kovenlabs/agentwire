"use client";

import { completeInteractive, interruptInteractive } from "@kovenlabs/agentwire-ai-sdk/react";

type FlightOption = {
  id: string;
  airline: string;
  price: number;
  depart: string;
  arrive: string;
  stops: number;
};

export function FlightGallery({
  toolCallId,
  input,
}: {
  toolCallId: string;
  input: { options: FlightOption[] };
}) {
  const choose = (flight: FlightOption) =>
    completeInteractive("pickFlight", toolCallId, {
      flightId: flight.id,
      airline: flight.airline,
      price: flight.price,
    });

  return (
    <div className="flex w-full flex-col gap-2">
      {input.options.map((f) => (
        <button
          type="button"
          key={f.id}
          onClick={() => choose(f)}
          className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:-translate-y-px hover:border-zinc-700 hover:bg-zinc-800/70 active:translate-y-0"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-zinc-800 bg-zinc-800 text-xs font-bold tracking-wide">
            {f.airline
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[15px] font-semibold">
              {f.depart} <span className="text-zinc-600">→</span> {f.arrive}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              {f.airline} · {f.stops === 0 ? "Nonstop" : `${f.stops} stop`}
            </div>
          </div>
          <div className="text-base font-bold text-indigo-400">${f.price}</div>
        </button>
      ))}
      <button
        type="button"
        onClick={() => interruptInteractive("pickFlight", toolCallId)}
        className="px-1 py-1 text-left text-sm text-zinc-500 transition hover:text-zinc-300"
      >
        None of these — let me ask something
      </button>
    </div>
  );
}
