"use client";

import React, { useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { MessageItem } from "./MessageItem";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolInvocationCard } from "./ToolInvocationCard";
import { GeneratedAssetCard } from "./GeneratedAssetCard";
import { WaitpointCard } from "./WaitpointCard";
import { useAppStore } from "@/lib/store";
import { Bot, Sparkles, Wand2, Film, Layers, Code2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageListProps {
  messages: Message[];
  onSelectPrompt?: (prompt: string) => void;
}

export function MessageList({ messages, onSelectPrompt }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const {
    isStreaming,
    streamingChatId,
    activeChatId,
    streamingThinking,
    streamingText,
    streamingTools,
    statusMessage,
    activeWaitpoint,
    setActiveWaitpoint,
    runStartedAt,
  } = useAppStore();

  const isCurrentChatStreaming = isStreaming && streamingChatId === activeChatId;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, streamingThinking, streamingTools, isCurrentChatStreaming]);

  const hasMessages = messages.length > 0 || isCurrentChatStreaming;

  if (!hasMessages) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 select-none max-w-2xl mx-auto text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center shadow-lg mb-4">
          <Sparkles size={24} className="text-white" />
        </div>
        <h2 className="text-xl md:text-2xl font-semibold text-zinc-100 mb-2 tracking-tight">
          What do you want to build today?
        </h2>
        <p className="text-xs md:text-sm text-zinc-400 mb-8 max-w-md">
          Run autonomous agents with provider-neutral tool calling, on-demand skills, and Magica media intelligence.
        </p>

        {/* Suggestion Prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
          <PromptCard
            icon={<Wand2 size={16} className="text-accent-purple" />}
            title="Generate AI Image (Magica)"
            description="Create image with GPT Image 2 model tool"
            onClick={() => onSelectPrompt?.("Use gpt_image_2 to generate an image of a futuristic cyberpunk laboratory with glowing blue crystals.")}
          />
          <PromptCard
            icon={<Code2 size={16} className="text-accent-blue" />}
            title="Crop & Reframe Image"
            description="Crop focal area using Magica crop_image tool"
            onClick={() => onSelectPrompt?.("Use crop_image to crop the center of https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200 with x=0.2, y=0.2, width=0.6, height=0.6.")}
          />
          <PromptCard
            icon={<Film size={16} className="text-accent-emerald" />}
            title="Merge Videos with Transition"
            description="Stitch video clips with smooth dissolve transition"
            onClick={() => onSelectPrompt?.("Use merge_videos to combine two clips with a dissolve transition.")}
          />
          <PromptCard
            icon={<Layers size={16} className="text-accent-amber" />}
            title="Load Skill on Demand"
            description="Progressively load image-editing skill guidance"
            onClick={() => onSelectPrompt?.("Load the image-editing skill and explain how coordinate cropping works.")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {messages
        .filter((msg) => !(isCurrentChatStreaming && msg.role === "assistant" && msg.status === "running"))
        .map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}

      {/* Live streaming message bubble */}
      {isCurrentChatStreaming && (
        <div className="flex gap-3 my-5 px-4 max-w-4xl mx-auto">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Bot size={17} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Live Thinking */}
            {Boolean(streamingThinking || !streamingText) && (
              <ThinkingBlock
                thinking={
                  streamingThinking && streamingThinking !== "Preparing response..."
                    ? streamingThinking
                    : streamingTools.some((t) => t.status === "running")
                    ? `Executing ${streamingTools.find((t) => t.status === "running")?.name} pipeline and awaiting GPU generation...`
                    : streamingThinking || "Analyzing intent and preparing execution plan..."
                }
                isStreaming={true}
                startTime={runStartedAt || undefined}
                hasAnswerStarted={Boolean(streamingText && streamingText.length > 0)}
              />
            )}

            {/* Live Streaming Tools */}
            {streamingTools.map((tool) => (
              <div key={tool.toolCallId} className="space-y-2">
                <ToolInvocationCard
                  name={tool.name}
                  input={tool.input}
                  output={tool.output}
                  status={tool.status}
                  creditsCost={tool.creditsCost}
                  durationMs={tool.durationMs}
                  startTime={tool.startedAt}
                />

                {/* Render live completed image */}
                {tool.output?.image_url && (
                  <GeneratedAssetCard
                    type="image"
                    url={tool.output.image_url}
                    title={tool.name === "crop_image" ? "Cropped Image Asset" : "Generated Image Asset"}
                    metadata={{
                      aspectRatio: tool.output.aspect_ratio || tool.input?.aspect_ratio,
                      prompt: tool.input?.prompt,
                    }}
                  />
                )}

                {/* Render live completed video */}
                {tool.output?.video_url && (
                  <GeneratedAssetCard
                    type="video"
                    url={tool.output.video_url}
                    title="Merged Video Output"
                    metadata={{
                      transition: tool.output.transition || tool.input?.transition,
                      duration: tool.output.duration,
                    }}
                  />
                )}
              </div>
            ))}

            {/* Live Text Delta Stream */}
            {streamingText && (
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
                  {streamingText}
                </ReactMarkdown>
              </div>
            )}

            {/* Live Human Waitpoint / Plan Approval Banner */}
            {activeWaitpoint && (
              <WaitpointCard
                runId={activeWaitpoint.runId}
                token={activeWaitpoint.token}
                title={activeWaitpoint.payload?.title}
                summary={activeWaitpoint.payload?.summary}
                onResolved={() => setActiveWaitpoint(null)}
              />
            )}

            {/* Live Active Status Indicator */}
            {(!streamingText || streamingTools.some((t) => t.status === "running")) && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-accent-blue animate-ping" />
                <span className="font-medium text-zinc-300">{statusMessage || "Agent is processing..."}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-6" />
    </div>
  );
}

function PromptCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-3 bg-surface-200 hover:bg-surface-100 text-left rounded-xl border border-border-subtle hover:border-border transition-all duration-150 group shadow-sm flex flex-col justify-between"
    >
      <div className="mb-2 p-1.5 w-fit rounded-lg bg-surface-300 border border-border-subtle group-hover:border-border transition-colors">
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
          {title}
        </div>
        <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
          {description}
        </div>
      </div>
    </button>
  );
}
