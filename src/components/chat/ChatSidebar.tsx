"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Chat } from "@/lib/types";
import {
  Plus,
  MessageSquare,
  Pin,
  Trash2,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bot,
  User as UserIcon,
} from "lucide-react";

export function ChatSidebar() {
  const queryClient = useQueryClient();
  const { activeChatId, setActiveChatId, isSidebarOpen, toggleSidebar } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: chatsData, isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: () => apiClient.getChats(50),
  });

  const { data: creditsData } = useQuery({
    queryKey: ["credits"],
    queryFn: () => apiClient.getCredits(),
  });

  const createChatMutation = useMutation({
    mutationFn: () => apiClient.createChat("New Chat"),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setActiveChatId(newChat.id);
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { isPinned?: boolean; title?: string } }) =>
      apiClient.updateChat(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteChat(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (activeChatId === deletedId) {
        setActiveChatId(null);
      }
    },
  });

  const chats = chatsData?.items || [];
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedChats = filteredChats.filter((c) => c.isPinned);
  const recentChats = filteredChats.filter((c) => !c.isPinned);

  if (!isSidebarOpen) {
    return (
      <div className="h-full bg-surface-300 border-r border-border-subtle flex flex-col items-center py-4 px-2 select-none">
        <button
          onClick={toggleSidebar}
          title="Expand sidebar"
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-surface-200 rounded-lg transition-colors"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => createChatMutation.mutate()}
          title="New Chat"
          className="mt-4 p-2 text-zinc-300 hover:text-zinc-100 hover:bg-surface-200 rounded-lg transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 md:w-72 h-full bg-surface-300 border-r border-border-subtle flex flex-col select-none transition-all duration-200 z-20">
      {/* Header */}
      <div className="p-3.5 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center shadow-sm">
            <Bot size={16} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">Galaxy Agent</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-surface-200 rounded-md transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={() => createChatMutation.mutate()}
          disabled={createChatMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-100 hover:bg-surface-50 text-zinc-200 hover:text-white rounded-lg border border-border text-xs font-medium transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus size={14} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-200 text-xs text-zinc-200 placeholder-zinc-500 rounded-md border border-transparent focus:border-border focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2">
        {/* Pinned Chats */}
        {pinnedChats.length > 0 && (
          <div>
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
              <Pin size={10} />
              <span>Pinned</span>
            </div>
            <div className="space-y-0.5">
              {pinnedChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  onSelect={() => setActiveChatId(chat.id)}
                  onTogglePin={() => updateChatMutation.mutate({ id: chat.id, updates: { isPinned: false } })}
                  onDelete={() => deleteChatMutation.mutate(chat.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Chats */}
        <div>
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Recent Chats
          </div>
          {isLoading ? (
            <div className="px-2 py-3 space-y-2">
              <div className="h-4 bg-surface-100 rounded animate-pulse" />
              <div className="h-4 bg-surface-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-surface-100 rounded animate-pulse w-1/2" />
            </div>
          ) : recentChats.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-zinc-500">No chats yet</div>
          ) : (
            <div className="space-y-0.5">
              {recentChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  onSelect={() => setActiveChatId(chat.id)}
                  onTogglePin={() => updateChatMutation.mutate({ id: chat.id, updates: { isPinned: true } })}
                  onDelete={() => deleteChatMutation.mutate(chat.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer: User profile & credits */}
      <div className="p-3 border-t border-border-subtle bg-surface-300">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center text-zinc-300 text-xs border border-border">
              <UserIcon size={12} />
            </div>
            <span className="text-xs font-medium text-zinc-300 truncate">Candidate Engineer</span>
          </div>
        </div>
        <div className="flex items-center justify-between bg-surface-200 px-2.5 py-1.5 rounded-md border border-border-subtle">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Sparkles size={12} className="text-accent-amber" />
            <span className="text-[11px] font-medium text-zinc-300">Credits</span>
          </div>
          <span className="text-[11px] font-semibold text-zinc-100">
            {creditsData?.balance ?? 1000}
          </span>
        </div>
      </div>
    </aside>
  );
}

function ChatItem({
  chat,
  isActive,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
        isActive
          ? "bg-surface-100 text-white font-medium border border-border"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-200 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 truncate pr-2">
        <MessageSquare size={13} className={isActive ? "text-accent-blue" : "text-zinc-500"} />
        <span className="truncate">{chat.title}</span>
      </div>

      <div className="hidden group-hover:flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={chat.isPinned ? "Unpin" : "Pin"}
          className="p-1 hover:text-zinc-100 rounded text-zinc-500"
        >
          <Pin size={11} className={chat.isPinned ? "fill-current text-zinc-200" : ""} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          className="p-1 hover:text-red-400 rounded text-zinc-500"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
