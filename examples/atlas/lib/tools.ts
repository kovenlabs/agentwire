import { defineTool } from "@kovenlabs/agentwire-tools";
import { z } from "zod";
import { bookingApi, flightsApi } from "./api";

// ── server: runs on the server, result returned to the model ────────────
export const searchFlights = defineTool.server({
  name: "searchFlights",
  description: "Search available flights between two cities on a date.",
  label: "Searching flights",
  inputSchema: z.object({
    from: z.string().describe("Origin city or airport"),
    to: z.string().describe("Destination city or airport"),
    date: z.string().describe("Departure date, e.g. 2026-12-03"),
  }),
  execute: ({ from, to, date }) => flightsApi.search({ from, to, date }),
});

// ── interactive: a gallery the traveler picks from ──────────────────────
export const pickFlight = defineTool.interactive({
  name: "pickFlight",
  description:
    "Show the traveler the flights returned by searchFlights and let them choose one. Pass the flights through verbatim.",
  label: "Choosing a flight",
  inputSchema: z.object({
    options: z.array(
      z.object({
        id: z.string(),
        airline: z.string(),
        price: z.number(),
        depart: z.string(),
        arrive: z.string(),
        stops: z.number(),
      }),
    ),
  }),
});

// ── interactive: a form the traveler fills in ───────────────────────────
export const collectPassenger = defineTool.interactive({
  name: "collectPassenger",
  description: "Ask the traveler for the passenger details needed to book the chosen flight.",
  label: "Collecting passenger details",
  inputSchema: z.object({
    fields: z.array(z.object({ id: z.string(), question: z.string() })),
  }),
});

// ── approval: charges money, so it needs a yes ──────────────────────────
export const bookFlight = defineTool.approval({
  name: "bookFlight",
  description: "Book the chosen flight for the passenger. Only call after a flight is picked.",
  approvalDescription: "This books the flight and charges the card — confirm to proceed.",
  label: "Booking flight",
  inputSchema: z.object({
    flightId: z.string(),
    passengerName: z.string(),
  }),
  execute: ({ flightId, passengerName }) => bookingApi.book(flightId, passengerName),
});

// ── client: UI side-effects resolved on the client ──────────────────────
export const showToast = defineTool.client({
  name: "showToast",
  description: "Show the traveler a short status message.",
  label: "Notifying",
  inputSchema: z.object({ message: z.string() }),
});

export const tools = {
  searchFlights,
  pickFlight,
  collectPassenger,
  bookFlight,
  showToast,
};
