"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message, ContentBlock } from "@/lib/types";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolInvocationCard } from "./ToolInvocationCard";
import { GeneratedAssetCard } from "./GeneratedAssetCard";
import { Bot, User as UserIcon, Copy, Check, AlertCircle, StopCircle, Paperclip, PanelRightOpen, Layers } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function MessageItem({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const { setArtifactContent } = useAppStore();
  const isUser = message.role === "user";

  const contentBlocks = Array.isArray(message.content) ? message.content : [];
  const thinkingBlock = contentBlocks.find((b: any) => b.type === "thinking");
  const toolCallBlocks = contentBlocks.filter((b: any) => b.type === "tool_call");
  const toolResultBlocks = contentBlocks.filter((b: any) => b.type === "tool_result");
  const textBlocks = contentBlocks.filter((b: any) => b.type === "text");
  const combinedText = textBlocks.map((b: any) => b.text).join("\n\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(combinedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end my-4 px-4">
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                <Paperclip size={13} className="text-accent-blue" />
                <span className="truncate max-w-[180px] font-medium">{att.fileName}</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {(att.fileSize / 1024).toFixed(0)} KB
                </span>
              </a>
            ))}
          </div>
        )}
        <div className="max-w-2xl bg-surface-100 border border-border text-zinc-100 rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap">
          {combinedText}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 my-5 px-4 max-w-4xl mx-auto group">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center shrink-0 shadow-sm mt-0.5">
        <Bot size={17} className="text-white" />
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        {/* Thinking Drawer - collapsed by default on completed turns */}
        {thinkingBlock && (
          <ThinkingBlock
            thinking={(thinkingBlock as any).thinking}
            durationMs={
              (thinkingBlock as any).durationMs ||
              (message.updatedAt && message.createdAt && message.status !== "running"
                ? Math.max(0, new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime())
                : undefined)
            }
            isStreaming={message.status === "running"}
            hasAnswerStarted={message.status !== "running" || combinedText.length > 0}
            startTime={message.createdAt}
          />
        )}

        {/* Tool Execution Cards & Generated Assets */}
        {toolCallBlocks.map((tcBlock: any) => {
          const matchingResult = toolResultBlocks.find(
            (trBlock: any) => trBlock.toolCallId === tcBlock.toolCallId
          ) as any;

          const isCompleted = Boolean(matchingResult);
          const isError = matchingResult?.isError;
          const status = isError ? "failed" : isCompleted ? "completed" : "running";
          const output = matchingResult?.output;

          return (
            <div key={tcBlock.toolCallId || tcBlock.name} className="space-y-2">
              <ToolInvocationCard
                name={tcBlock.name}
                input={tcBlock.input}
                output={output}
                status={status}
                durationMs={matchingResult?.durationMs}
                creditsCost={matchingResult?.creditsCost}
                startTime={message.createdAt}
              />

              {/* Render Image Assets */}
              {output?.image_url && (
                <GeneratedAssetCard
                  type="image"
                  url={output.image_url}
                  title={tcBlock.name === "crop_image" ? "Cropped Image Asset" : "Generated Image Asset"}
                  metadata={{
                    aspectRatio: output.aspect_ratio || tcBlock.input?.aspect_ratio,
                    prompt: tcBlock.input?.prompt,
                  }}
                />
              )}

              {/* Render Video Assets */}
              {output?.video_url && (
                <GeneratedAssetCard
                  type="video"
                  url={output.video_url}
                  title="Merged Video Output"
                  metadata={{
                    transition: output.transition || tcBlock.input?.transition,
                    duration: output.duration,
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Text Content */}
        {combinedText ? (
          <div className="prose prose-invert prose-zinc max-w-none text-sm leading-relaxed text-zinc-200 mt-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ src, alt }) => (
                  <span className="block my-3">
                    <img
                      src={src}
                      alt={alt || "Generated Asset"}
                      className="rounded-xl max-h-96 object-contain border border-border-subtle bg-black/30 shadow-md"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </span>
                ),
              }}
            >
              {combinedText}
            </ReactMarkdown>
          </div>
        ) : message.status === "running" && toolCallBlocks.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
            <span className="w-2 h-2 rounded-full bg-accent-blue animate-ping" />
            <span>Agent is working...</span>
          </div>
        ) : null}

        {/* Plan Mode Banner: Offer to open in Artifact Panel */}
        {combinedText && (combinedText.includes("Strategic Objective") || combinedText.includes("Execution Plan")) && (
          <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-purple-950/25 border border-purple-800/40">
            <div className="flex items-center gap-2 text-xs text-purple-200">
              <Layers size={14} className="text-purple-400" />
              <span className="font-medium">Architectural Execution Plan</span>
            </div>
            <button
              type="button"
              onClick={() => setArtifactContent({ title: "Execution Plan Specification", type: "plan", content: combinedText })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 text-purple-300 text-xs font-medium transition-colors border border-accent-purple/40"
            >
              <PanelRightOpen size={13} />
              <span>Inspect Plan</span>
            </button>
          </div>
        )}

        {/* Status badges */}
        {message.status === "cancelled" && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/60 text-amber-400 text-xs font-medium">
            <StopCircle size={13} />
            <span>Generation cancelled</span>
          </div>
        )}

        {message.status === "failed" && (
          <div className="mt-2 flex items-start gap-2 p-2.5 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-medium">Execution stopped</p>
              <p className="text-red-400 text-[11px] mt-0.5">
                {message.errorMessage || "The agent turn could not complete. Please retry."}
              </p>
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        {combinedText && message.status === "completed" && (
          <div className="mt-2.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              title="Copy response"
              className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-surface-200 transition-colors flex items-center gap-1 text-[11px]"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
