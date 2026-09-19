"use client";

import React, { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { ArtifactPanel } from "@/components/chat/ArtifactPanel";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentStreamingRunIdRef = useRef<string | null>(null);

  const {
    activeChatId,
    setActiveChatId,
    activeRunId,
    isStreaming,
    streamingChatId,
    startStreaming,
    appendThinking,
    appendText,
    onToolStart,
    onToolEnd,
    setStatusMessage,
    setActiveWaitpoint,
    stopStreaming,
  } = useAppStore();

  // Fetch active chat & messages
  const { data: chatData, isLoading } = useQuery({
    queryKey: ["chat", activeChatId],
    queryFn: () => (activeChatId ? apiClient.getChat(activeChatId) : null),
    enabled: !!activeChatId,
  });

  // Reload / Navigation Recovery: Reconnect to active running turn on mount or when switching chats
  useEffect(() => {
    // If a stream is already actively running for the current active chat, don't interrupt it
    if (currentStreamingRunIdRef.current) {
      return;
    }

    if (chatData?.activeRun && (chatData.activeRun.status === "running" || chatData.activeRun.status === "waiting")) {
      connectToStream(chatData.activeRun.id, chatData.chat.id);
    } else if (streamingChatId && streamingChatId !== activeChatId) {
      // Switched away to a different chat that is not running
      cleanupStream();
    }
  }, [chatData?.activeRun?.id, chatData?.activeRun?.status, activeChatId, streamingChatId]);

  const connectToStream = (runId: string, targetChatId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    currentStreamingRunIdRef.current = runId;
    startStreaming(runId, targetChatId);

    const streamUrl = apiClient.getStreamUrl(runId);
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.addEventListener("thinking", (e) => {
      try {
        const data = JSON.parse(e.data);
        appendThinking(data.text);
      } catch (_) {}
    });

    es.addEventListener("text_delta", (e) => {
      try {
        const data = JSON.parse(e.data);
        appendText(data.text);
      } catch (_) {}
    });

    es.addEventListener("tool_start", (e) => {
      try {
        const data = JSON.parse(e.data);
        onToolStart(data);
      } catch (_) {}
    });

    es.addEventListener("tool_end", (e) => {
      try {
        const data = JSON.parse(e.data);
        onToolEnd(data);
      } catch (_) {}
    });

    es.addEventListener("waitpoint", (e) => {
      try {
        const data = JSON.parse(e.data);
        setActiveWaitpoint(data);
        setStatusMessage("Awaiting your approval...");
      } catch (_) {}
    });

    es.addEventListener("waitpoint_resolved", () => {
      setActiveWaitpoint(null);
      queryClient.invalidateQueries({ queryKey: ["chat", targetChatId] });
    });

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        setStatusMessage(data.step || data.status);
      } catch (_) {}
    });

    es.addEventListener("done", async () => {
      try {
        // Refetch the database turn first to ensure seamless transition without gap
        await queryClient.refetchQueries({ queryKey: ["chat", targetChatId] });
      } catch (err) {
        console.error("Failed to refetch chat messages on stream completion:", err);
      }
      cleanupStream();
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    });

    es.addEventListener("error", async () => {
      try {
        await queryClient.refetchQueries({ queryKey: ["chat", targetChatId] });
      } catch (_) {}
      cleanupStream();
    });
  };

  const cleanupStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    currentStreamingRunIdRef.current = null;
    stopStreaming();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSendMessage = async (text: string, planMode: boolean, attachmentIds?: string[]) => {
    try {
      let chatId = activeChatId;

      if (!chatId) {
        const newChat = await apiClient.createChat("New Chat");
        chatId = newChat.id;
        setActiveChatId(chatId);
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }

      // 1. Optimistically append the user message so it shows in the UI instantly
      const tempId = `temp_${Date.now()}`;
      queryClient.setQueryData(["chat", chatId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...(old.messages || []),
            {
              id: tempId,
              chatId,
              role: "user",
              content: [{ type: "text", text }],
              status: "completed",
              createdAt: new Date().toISOString(),
              attachments: [],
            },
          ],
        };
      });

      // 2. Immediately put UI in active agent thinking state
      const tempRunId = `run_${Date.now()}`;
      startStreaming(tempRunId, chatId);
      setStatusMessage("Connecting to Galaxy agent...");

      // 3. Dispatch to backend
      const res = await apiClient.sendMessage(chatId, {
        content: text,
        planMode,
        attachmentIds,
      });

      // 4. Update the chat query with the real user message and active run
      queryClient.setQueryData(["chat", chatId], (old: any) => {
        if (!old) return old;
        const filtered = (old.messages || []).filter((m: any) => m.id !== tempId);
        return {
          ...old,
          chat: {
            ...old.chat,
            title: old.chat.title === "New Chat" ? text.slice(0, 36).trim() : old.chat.title,
          },
          messages: [...filtered, res.userMessage],
          activeRun: { id: res.runId, status: "running" },
        };
      });

      queryClient.invalidateQueries({ queryKey: ["chats"] });

      // 5. Connect SSE to the actual runId
      connectToStream(res.runId, chatId);
    } catch (err: any) {
      console.error("Failed to send message:", err);
      cleanupStream();
      alert(err.message || "Failed to send message");
    }
  };

  const handleCancel = async () => {
    if (activeRunId) {
      try {
        await apiClient.cancelRun(activeRunId);
      } catch (err) {
        console.error("Failed to cancel run:", err);
      }
    }
    cleanupStream();
    queryClient.invalidateQueries({ queryKey: ["chat", activeChatId] });
  };

  const currentChat = chatData?.chat;
  const messages = chatData?.messages || [];

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative">
        <ChatHeader title={currentChat?.title} />

        {/* Message Viewport */}
        <MessageList
          messages={messages}
          onSelectPrompt={(prompt) => handleSendMessage(prompt, false)}
        />

        {/* Composer */}
        <Composer
          onSend={handleSendMessage}
          onCancel={handleCancel}
          disabled={isLoading}
        />
      </div>

      {/* Slide-out Artifact Inspector */}
      <ArtifactPanel />
    </div>
  );
}
