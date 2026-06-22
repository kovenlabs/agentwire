// A fake flights/booking backend so the demo runs with no external services.

export interface Flight {
  id: string;
  airline: string;
  from: string;
  to: string;
  date: string;
  depart: string;
  arrive: string;
  price: number;
  stops: number;
}

const AIRLINES = ["TAP Air", "Lufthansa", "ANA", "Emirates", "KLM", "Qatar Airways"];

function seededFlights(from: string, to: string, date: string): Flight[] {
  const count = 4 + (from.length % 3);
  return Array.from({ length: count }, (_, i) => {
    const departH = 6 + i * 3;
    const dur = 7 + (i % 4);
    return {
      id: `${from.slice(0, 3).toUpperCase()}-${to.slice(0, 3).toUpperCase()}-${100 + i}`,
      airline: AIRLINES[(from.length + i) % AIRLINES.length] ?? "TAP Air",
      from,
      to,
      date,
      depart: `${String(departH).padStart(2, "0")}:15`,
      arrive: `${String((departH + dur) % 24).padStart(2, "0")}:40`,
      price: 320 + i * 85 + (to.length % 5) * 40,
      stops: i % 3 === 0 ? 0 : 1,
    };
  }).sort((a, b) => a.price - b.price);
}

export const flightsApi = {
  async search({ from, to, date }: { from: string; to: string; date: string }): Promise<Flight[]> {
    await new Promise((r) => setTimeout(r, 400)); // pretend it's a network call
    return seededFlights(from, to, date);
  },
};

export const bookingApi = {
  async book(flightId: string, passengerName: string) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      confirmation: `ATLAS-${flightId}-${Math.abs(hash(passengerName)) % 100000}`,
      flightId,
      passengerName,
      status: "confirmed" as const,
    };
  },
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
