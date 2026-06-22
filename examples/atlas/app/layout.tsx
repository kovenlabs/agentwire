import type { Metadata } from "next";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas — agentwire example",
  description: "A flight-booking agent built with agentwire + Vercel AI SDK + Anthropic.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster theme="dark" position="bottom-center" richColors />
      </body>
    </html>
  );
}
