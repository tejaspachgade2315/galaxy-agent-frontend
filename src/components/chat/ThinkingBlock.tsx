"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

interface ThinkingBlockProps {
  thinking: string;
  isStreaming?: boolean;
  durationMs?: number;
  hasAnswerStarted?: boolean;
  startTime?: string | number | Date;
}

export function ThinkingBlock({
  thinking,
  isStreaming = false,
  durationMs,
  hasAnswerStarted = false,
  startTime,
}: ThinkingBlockProps) {
  // Actively thinking when streaming and answer has not yet started
  const isActivelyThinking = isStreaming && !hasAnswerStarted;

  // Open by default ONLY while actively thinking; collapse once answer starts or turn completes
  const [isOpen, setIsOpen] = useState(isActivelyThinking);

  // Anchor initial elapsed time to the actual start timestamp so page reload never resets counter to 0
  const getInitialElapsed = () => {
    if (startTime) {
      const ms = Date.now() - new Date(startTime).getTime();
      return Math.max(0, +(ms / 1000).toFixed(1));
    }
    return 0;
  };

  const [elapsedSec, setElapsedSec] = useState<number>(getInitialElapsed);

  useEffect(() => {
    if (isActivelyThinking) {
      setIsOpen(true);
      const startMs = startTime ? new Date(startTime).getTime() : Date.now() - elapsedSec * 1000;
      const timer = setInterval(() => {
        const diff = Math.max(0, (Date.now() - startMs) / 1000);
        setElapsedSec(+diff.toFixed(1));
      }, 100);
      return () => clearInterval(timer);
    } else {
      // Auto-collapse when answer starts or when done
      setIsOpen(false);
    }
  }, [isActivelyThinking, startTime]);

  if (!thinking || thinking.trim().length === 0) return null;

  const durationDisplay = isActivelyThinking
    ? `${elapsedSec.toFixed(1)}s`
    : durationMs
    ? `${(durationMs / 1000).toFixed(1)}s`
    : elapsedSec > 0
    ? `${elapsedSec.toFixed(1)}s`
    : null;

  return (
    <div className="my-2.5 rounded-lg border border-border-subtle bg-surface-200/80 overflow-hidden text-xs transition-all max-w-2xl">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-surface-100 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Brain
            size={13}
            className={isActivelyThinking ? "text-accent-purple animate-pulse" : "text-zinc-500"}
          />
          <span className="font-medium text-zinc-300">
            {isActivelyThinking ? "Thinking..." : "Thought process"}
          </span>
          {durationDisplay && (
            <span className="text-[10px] text-zinc-500 font-mono bg-surface-300 px-1.5 py-0.5 rounded border border-border-subtle">
              {durationDisplay}
            </span>
          )}
        </div>
        <div className="text-zinc-500">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 py-2.5 border-t border-border-subtle font-mono text-[11px] leading-relaxed text-zinc-400 bg-surface-300/90 whitespace-pre-wrap max-h-56 overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}
