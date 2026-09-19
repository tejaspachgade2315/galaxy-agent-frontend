"use client";

import React, { useState } from "react";
import {
  Scissors,
  Wand2,
  Film,
  BookOpen,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ToolInvocationCardProps {
  name: string;
  input: any;
  output?: any;
  status: "running" | "completed" | "failed";
  durationMs?: number;
  creditsCost?: number;
  errorMessage?: string;
}

export function ToolInvocationCard({
  name,
  input,
  output,
  status,
  durationMs,
  creditsCost,
  errorMessage,
}: ToolInvocationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "crop_image":
        return <Scissors size={14} className="text-accent-blue" />;
      case "gpt_image_2":
        return <Wand2 size={14} className="text-accent-purple" />;
      case "merge_videos":
        return <Film size={14} className="text-accent-emerald" />;
      case "load_skill":
      case "read_skill_asset":
        return <BookOpen size={14} className="text-accent-amber" />;
      default:
        return <FileCode size={14} className="text-zinc-400" />;
    }
  };

  const getToolTitle = (toolName: string) => {
    switch (toolName) {
      case "crop_image":
        return "Crop Image";
      case "gpt_image_2":
        return "GPT Image 2";
      case "merge_videos":
        return "Merge Videos";
      case "load_skill":
        return `Load Skill: ${input?.skill_name || ""}`;
      case "read_skill_asset":
        return `Read Asset: ${input?.asset_path || ""}`;
      default:
        return toolName;
    }
  };

  return (
    <div className="my-3 rounded-xl border border-border bg-surface-200/90 overflow-hidden text-xs max-w-2xl shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-100/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-surface-300 border border-border-subtle">
            {getToolIcon(name)}
          </div>
          <div>
            <div className="font-semibold text-zinc-200 flex items-center gap-2">
              <span>{getToolTitle(name)}</span>
              {creditsCost !== undefined && creditsCost > 0 && (
                <span className="text-[10px] text-accent-amber font-mono bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={10} />
                  <span>{creditsCost} cr</span>
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
              tool: {name}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {status === "running" && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-accent-blue text-[11px] font-medium">
              <Loader2 size={12} className="animate-spin" />
              <span>Executing...</span>
            </div>
          )}

          {status === "completed" && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <CheckCircle2 size={12} />
              <span>
                {durationMs ? `${(durationMs / 1000).toFixed(1)}s` : "Done"}
              </span>
            </div>
          )}

          {status === "failed" && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium">
              <AlertCircle size={12} />
              <span>Failed</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-surface-300 transition-colors"
            title="Toggle details"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Collapsible Details (Sanitized Input & Output) */}
      {isExpanded && (
        <div className="p-3 border-t border-border-subtle bg-surface-300/80 font-mono text-[11px] space-y-2">
          <div>
            <div className="text-zinc-500 font-sans text-[10px] uppercase font-semibold mb-1">
              Parameters
            </div>
            <pre className="p-2 rounded bg-surface-400 text-zinc-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>

          {output && (
            <div>
              <div className="text-zinc-500 font-sans text-[10px] uppercase font-semibold mb-1">
                Result
              </div>
              <pre className="p-2 rounded bg-surface-400 text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}

          {errorMessage && (
            <div className="text-red-400 font-sans text-xs bg-red-950/40 border border-red-900/50 p-2 rounded">
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
