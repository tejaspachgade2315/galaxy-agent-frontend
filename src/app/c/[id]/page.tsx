"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import ChatPage from "@/app/page";

export default function ChatByIdPage() {
  const params = useParams();
  const { setActiveChatId } = useAppStore();

  useEffect(() => {
    if (params.id && typeof params.id === "string") {
      setActiveChatId(params.id);
    }
  }, [params.id, setActiveChatId]);

  return <ChatPage />;
}
