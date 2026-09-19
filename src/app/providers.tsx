"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/nextjs";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  let clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_bWFqb3Itb3gtNzA4Ni5jbGVyay5hY2NvdW50cy5kZXYk";

  // If a pk_live key without DNS CNAME records is detected, automatically use the working pk_test key
  if (clerkKey && clerkKey.startsWith("pk_live_")) {
    try {
      const raw = clerkKey.replace("pk_live_", "");
      const decoded = typeof atob === "function" ? atob(raw) : Buffer.from(raw, "base64").toString();
      if (decoded.includes("vercel.app")) {
        clerkKey = "pk_test_bWFqb3Itb3gtNzA4Ni5jbGVyay5hY2NvdW50cy5kZXYk";
      }
    } catch {
      // ignore
    }
  }

  // If Clerk publishable key is present, wrap in ClerkProvider
  if (clerkKey && clerkKey.trim().length > 0) {
    return (
      <ClerkProvider
        publishableKey={clerkKey}
        appearance={{
          layout: {
            unsafe_disableDevelopmentModeWarnings: true,
          },
        }}
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ClerkProvider>
    );
  }

  // Graceful Dev Mode wrapper
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
