import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Galaxy Agent Chat | Production AI Workspace",
  description: "Production-grade agent chat experience with durable tool execution and OpenRouter Free orchestration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-zinc-100 antialiased h-screen w-screen overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
