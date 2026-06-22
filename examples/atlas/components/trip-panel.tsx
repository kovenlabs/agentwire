"use client";

import {
  useInteractiveResultState,
  useToolResultState,
} from "@kovenlabs/agentwire-ai-sdk/react";
import type { Flight } from "@/lib/api";

type Booking = { confirmation: string; passengerName: string };
type PickFlightResult = { status: "completed"; flightId: string; airline: string; price: number };

/**
 * A panel that lives OUTSIDE the chat. It never touches `chat.messages` — it just
 * subscribes to the bus and reflects whatever the agent does. This is the
 * out-of-chat consumer pattern: server tools auto-publish on
 * `tool:<name>:result`, and interactive picks land on the resolve channel.
 *
 * The `*State` hooks return the latest value directly — no `useState` plumbing.
 */
export function TripPanel() {
  const flights = useToolResultState<Flight[]>("searchFlights");
  const booking = useToolResultState<Booking>("bookFlight");
  const picked = useInteractiveResultState<PickFlightResult>("pickFlight");

  const route = flights?.[0] ? `${flights[0].from} → ${flights[0].to}` : null;
  const idle = !flights && !picked && !booking;

  return (
    <div className="sticky top-4 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Your trip</h2>
        <span className="rounded-full border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
          live · off-chat
        </span>
      </div>

      {idle && (
        <p className="text-sm leading-relaxed text-zinc-500">
          Your itinerary appears here as Atlas works — driven entirely by the bus, not the chat
          render.
        </p>
      )}

      {route && <Row label="Route" value={route} />}
      {flights && !picked && <Row label="Options" value={`${flights.length} flights`} />}

      {picked && (
        <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-3">
          <div className="text-[10px] uppercase tracking-wide text-indigo-300/70">Selected flight</div>
          <div className="mt-1 font-semibold">{picked.airline}</div>
          <div className="text-xs text-zinc-400">
            {picked.flightId} · ${picked.price}
          </div>
        </div>
      )}

      {booking && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="text-[10px] uppercase tracking-wide text-emerald-300/70">Booked</div>
          <div className="mt-1 font-mono text-sm text-emerald-300">{booking.confirmation}</div>
          {booking.passengerName && (
            <div className="text-xs text-zinc-400">{booking.passengerName}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
