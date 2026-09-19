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

  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // If Clerk publishable key is present, wrap in ClerkProvider
  if (clerkKey && clerkKey.trim().length > 0) {
    return (
      <ClerkProvider publishableKey={clerkKey}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ClerkProvider>
    );
  }

  // Graceful Dev Mode wrapper
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
