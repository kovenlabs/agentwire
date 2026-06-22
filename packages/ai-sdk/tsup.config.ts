import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", react: "src/react.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: [
    "react",
    "ai",
    "@ai-sdk/react",
    "@kovenlabs/agentwire",
    "@kovenlabs/agentwire-react",
    "@kovenlabs/agentwire-tools",
  ],
});
