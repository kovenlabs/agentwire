# Atlas — agentwire example

A runnable flight-booking agent built with **agentwire** + the Vercel AI SDK +
Anthropic. It exercises every tool kind:

| Tool | Kind | UI |
| --- | --- | --- |
| `searchFlights` | server | result chip |
| `pickFlight` | interactive | flight gallery |
| `collectPassenger` | interactive | passenger form |
| `bookFlight` | approval | Approve/Deny card → `addToolApprovalResponse` |
| `showToast` | client | toast via `toolHandlers` |

The flights/booking backend is mocked (`lib/api.ts`) so it runs with no external
services beyond the model.

## Run

```bash
# from the repo root: build the workspace packages first
pnpm build

# add your key
echo 'ANTHROPIC_API_KEY="sk-ant-..."' > examples/atlas/.env.local

# start it
pnpm --filter @kovenlabs/agentwire-example-atlas dev
# → http://localhost:3000
```

Try: _“Find me a flight from Lisbon to Tokyo on Dec 3”_.

## Worth a look

- `lib/tools.ts` — all five tools, one `defineTool.*` each.
- `app/api/chat/route.ts` — `toAiToolSet(tools)` → `streamText`.
- `components/atlas.tsx` — the whole client. Flip the **Renderer** dropdown to
  switch between the managed `<AgentMessages>` and a hand-rolled
  `renderMessageParts` layout — same primitives, your own markup. You are not
  locked into the component.
- `components/flight-gallery.tsx` / `passenger-form.tsx` — interactive widgets
  that settle their call with `resolveInteractive` / `interruptInteractive`.
