"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import { X, Copy, Check, FileCode, ExternalLink } from "lucide-react";

export function ArtifactPanel() {
  const { isArtifactOpen, toggleArtifact, artifactContent } = useAppStore();
  const [copied, setCopied] = useState(false);

  if (!isArtifactOpen) return null;

  const title = artifactContent?.title || "Artifact Inspector";
  const type = artifactContent?.type || "code";
  const content =
    artifactContent?.content ||
    `// Galaxy Artifact Engine\n// Generated assets, code files, and media will render here interactively.\n\nexport const systemStatus = {\n  orchestrator: "active",\n  relationalIntegrity: true,\n  magicaTools: ["crop_image", "gpt_image_2", "merge_videos"],\n};`;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 md:w-96 h-full bg-surface-300 border-l border-border-subtle flex flex-col z-20 shadow-xl select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-accent-blue" />
          <span className="text-xs font-semibold text-zinc-200 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy content"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-surface-200 rounded-md transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={toggleArtifact}
            title="Close panel"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-surface-200 rounded-md transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 bg-surface-400 font-mono text-xs text-zinc-300 leading-relaxed">
        <pre className="whitespace-pre-wrap">{content}</pre>
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-border-subtle text-[11px] text-zinc-500 flex items-center justify-between bg-surface-300">
        <span>Type: {type}</span>
        <span>Galaxy Artifact Runtime</span>
      </div>
    </aside>
  );
}
