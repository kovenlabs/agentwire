import { consoleLogger } from "@kovenlabs/agentwire";
import { toAiToolSet } from "@kovenlabs/agentwire-ai-sdk";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { tools } from "@/lib/tools";

export const maxDuration = 60;

const SYSTEM = `You are Atlas, a concise flight-booking assistant.

Follow this flow:
1. When the traveler wants a flight, call searchFlights with from/to/date.
2. Then call pickFlight, passing the flights you got back so they can choose one.
3. Once they pick, call collectPassenger with fields [{ id: "fullName", question: "Full name (as on passport)" }].
4. Then call bookFlight with the chosen flightId and the passenger's full name.
5. After booking, call showToast with a celebratory confirmation message.

Keep replies short. Do not invent flights — always use searchFlights results.`;

export async function POST(req: Request) {
  const { messages, chatId, agent } = await req.json();

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools: toAiToolSet(tools, { logger: consoleLogger }),
    stopWhen: stepCountIs(10),
    experimental_context: { chatId, agent },
  });

  return result.toUIMessageStreamResponse();
}
