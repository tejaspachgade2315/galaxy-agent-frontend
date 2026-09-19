"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { Menu, PanelRightClose, PanelRightOpen, Cpu, Sparkles } from "lucide-react";

export function ChatHeader({ title }: { title?: string }) {
  const { isSidebarOpen, toggleSidebar, isArtifactOpen, toggleArtifact } = useAppStore();

  return (
    <header className="h-13 py-2.5 px-4 bg-surface-300 border-b border-border-subtle flex items-center justify-between select-none z-10">
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-surface-200 rounded-md transition-colors"
            title="Open sidebar"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-zinc-200 truncate max-w-xs md:max-w-md">
            {title || "Galaxy Agent Chat"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* OpenRouter Free Model Badge */}
        <div className="flex items-center gap-1.5 bg-surface-200 border border-border px-2.5 py-1 rounded-full text-xs text-zinc-300 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Cpu size={12} className="text-zinc-400" />
          <span className="font-mono text-[11px] font-medium text-zinc-200">openrouter/free</span>
        </div>

        {/* Artifact panel toggle */}
        <button
          onClick={toggleArtifact}
          className={`p-1.5 rounded-md border transition-colors ${
            isArtifactOpen
              ? "bg-surface-100 text-white border-border"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-200 border-transparent"
          }`}
          title={isArtifactOpen ? "Close Artifacts" : "Open Artifacts"}
        >
          {isArtifactOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>
      </div>
    </header>
  );
}
