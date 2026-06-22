"use client";

import { completeInteractive } from "@kovenlabs/agentwire-ai-sdk/react";
import { useState } from "react";

type Field = { id: string; question: string };

export function PassengerForm({
  toolCallId,
  input,
}: {
  toolCallId: string;
  input: { fields: Field[] };
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const submit = () => {
    completeInteractive("collectPassenger", toolCallId, {
      answers: input.fields.map((f) => ({ id: f.id, answer: answers[f.id] ?? "" })),
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex w-fit items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
        Passenger details sent ✓
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex w-full flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="font-semibold">Passenger details</div>
      {input.fields.map((f) => (
        <label key={f.id} className="flex flex-col gap-1.5 text-sm text-zinc-400">
          {f.question}
          <input
            value={answers[f.id] ?? ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [f.id]: e.target.value }))}
            required
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-[15px] text-zinc-100 outline-none transition focus:border-indigo-500"
          />
        </label>
      ))}
      <button
        type="submit"
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
      >
        Continue
      </button>
    </form>
  );
}
