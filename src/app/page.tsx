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
import { SignedIn, SignedOut, SignInButton, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { Bot, LogIn } from "lucide-react";

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
    setThinking,
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
    if (currentStreamingRunIdRef.current && streamingChatId === activeChatId) {
      return;
    }

    if (chatData?.activeRun && (chatData.activeRun.status === "running" || chatData.activeRun.status === "waiting")) {
      const runStart = (chatData.activeRun as any).startedAt || (chatData.activeRun as any).createdAt;
      connectToStream(chatData.activeRun.id, chatData.chat.id, runStart);
    } else if (streamingChatId && streamingChatId !== activeChatId) {
      // Switched away to a different chat or New Chat that is not running
      cleanupStream();
    }
  }, [chatData?.activeRun?.id, chatData?.activeRun?.status, activeChatId, streamingChatId]);

  const connectToStream = (runId: string, targetChatId: string, startedAt?: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    currentStreamingRunIdRef.current = runId;
    startStreaming(runId, targetChatId, startedAt);

    const streamUrl = apiClient.getStreamUrl(runId);
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.addEventListener("thinking", (e) => {
      try {
        const data = JSON.parse(e.data);
        appendThinking(data.text);
      } catch (_) {}
    });

    // Full thinking replacement from DB fallback (when on a different serverless container)
    es.addEventListener("thinking_sync", (e) => {
      try {
        const data = JSON.parse(e.data);
        setThinking(data.text);
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

    es.addEventListener("connected", () => {
      setStatusMessage("Agent connected...");
    });

    es.addEventListener("error", async () => {
      try {
        const fresh = await apiClient.getChat(targetChatId);
        if (!fresh?.activeRun || fresh.activeRun.status === "completed" || fresh.activeRun.status === "failed") {
          await queryClient.refetchQueries({ queryKey: ["chat", targetChatId] });
          cleanupStream();
        }
      } catch (_) {}
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

  // Resilient Database Polling Fallback: only syncs thinking text and terminal status.
  // Tool events are NOT emitted here — SSE stream handles those exclusively to prevent duplicates.
  useEffect(() => {
    if (!isStreaming || !activeChatId) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await apiClient.getChat(activeChatId);
        if (!fresh) return;

        // Check if run completed or failed in DB
        if (!fresh.activeRun || fresh.activeRun.status === "completed" || fresh.activeRun.status === "failed") {
          await queryClient.refetchQueries({ queryKey: ["chat", activeChatId] });
          queryClient.invalidateQueries({ queryKey: ["chats"] });
          queryClient.invalidateQueries({ queryKey: ["credits"] });
          cleanupStream();
          return;
        }

        // Sync thinking text only (tools are streamed via SSE to avoid duplicates)
        const runningAssistant = (fresh.messages || []).find(
          (m: any) => m.role === "assistant" && m.status === "running"
        );
        if (runningAssistant && Array.isArray(runningAssistant.content)) {
          for (const block of (runningAssistant.content as any[])) {
            if (block.type === "thinking" && block.thinking && block.thinking !== "Preparing response...") {
              setThinking(block.thinking);
            }
          }
        }
      } catch (_) {
        // Ignore transient polling errors
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isStreaming, activeChatId]);

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
      const turnStartTime = new Date().toISOString();
      const tempRunId = `run_${Date.now()}`;
      startStreaming(tempRunId, chatId, turnStartTime);
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
          activeRun: { id: res.runId, status: "running", startedAt: turnStartTime },
        };
      });

      queryClient.invalidateQueries({ queryKey: ["chats"] });

      // 5. Connect SSE to the actual runId
      connectToStream(res.runId, chatId, turnStartTime);
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
    <>
      <ClerkLoading>
        <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-background text-zinc-400 select-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center shadow-xl mb-4 animate-pulse">
            <Bot size={28} className="text-white" />
          </div>
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-blue animate-ping" />
            <span>Loading Galaxy Workspace...</span>
          </div>
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <SignedIn>
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
        </SignedIn>

        <SignedOut>
          <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-background p-6 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center shadow-xl mb-6">
              <Bot size={32} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-3 tracking-tight">
              Galaxy Agent Chat
            </h1>
            <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
              Autonomous agent workspace with provider-neutral tool calling, on-demand skills, and Magica media intelligence.
            </p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-gradient-to-r from-accent-blue to-accent-purple hover:opacity-95 text-white font-medium rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center gap-2.5 text-sm">
                <LogIn size={16} />
                <span>Sign In with Clerk to Start</span>
              </button>
            </SignInButton>
            <div className="mt-8 flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>OpenRouter Free · Magica APIs · Neon Postgres</span>
            </div>
          </div>
        </SignedOut>
      </ClerkLoaded>
    </>
  );
}
