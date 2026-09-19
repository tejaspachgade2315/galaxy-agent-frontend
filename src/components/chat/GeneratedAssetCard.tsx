"use client";

import React, { useState } from "react";
import { Download, ExternalLink, Maximize2, Sparkles, Film, Image as ImageIcon, Copy, Check } from "lucide-react";

interface GeneratedAssetCardProps {
  type: "image" | "video";
  url: string;
  title?: string;
  metadata?: {
    aspectRatio?: string;
    transition?: string;
    duration?: number;
    prompt?: string;
  };
}

export function GeneratedAssetCard({ type, url, title, metadata }: GeneratedAssetCardProps) {
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [hasError, setHasError] = useState(false);

  return (
    <div className="my-3 rounded-xl border border-border bg-surface-200/90 overflow-hidden max-w-xl shadow-md group transition-all">
      {/* Media Header */}
      <div className="px-3 py-2 bg-surface-100/60 border-b border-border-subtle flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
          {type === "image" ? (
            <ImageIcon size={14} className="text-accent-purple" />
          ) : (
            <Film size={14} className="text-accent-emerald" />
          )}
          <span>{title || (type === "image" ? "Generated Image Asset" : "Merged Video Asset")}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {metadata?.aspectRatio && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-300 border border-border-subtle text-zinc-400">
              {metadata.aspectRatio}
            </span>
          )}
          {metadata?.transition && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-300 border border-border-subtle text-accent-emerald">
              {metadata.transition}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopyUrl}
            title="Copy URL"
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-surface-300 transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-surface-300 transition-colors"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Media Viewport */}
      <div className="relative bg-black/40 flex items-center justify-center overflow-hidden min-h-[140px]">
        {type === "image" ? (
          hasError ? (
            <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-surface-300 flex items-center justify-center text-zinc-400">
                <ImageIcon size={20} />
              </div>
              <p className="text-xs text-zinc-400 font-medium">Media Preview Unavailable</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-accent-blue hover:underline inline-flex items-center gap-1"
              >
                <span>Direct Asset Link</span>
                <ExternalLink size={11} />
              </a>
            </div>
          ) : (
            <div className="relative group/img cursor-pointer w-full flex justify-center" onClick={() => setIsZoomed(true)}>
              <img
                src={url}
                alt={title || "Generated Asset"}
                onError={() => setHasError(true)}
                className="w-full max-h-96 object-contain rounded-b-xl transition-transform duration-200 group-hover/img:scale-[1.01]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <span className="p-2 rounded-full bg-surface-100/80 text-white shadow-lg backdrop-blur">
                  <Maximize2 size={16} />
                </span>
              </div>
            </div>
          )
        ) : (
          <video
            src={url}
            controls
            playsInline
            className="w-full max-h-96 rounded-b-xl"
            preload="metadata"
          />
        )}
      </div>

      {/* Optional prompt caption */}
      {metadata?.prompt && (
        <div className="px-3 py-2 text-[11px] text-zinc-400 border-t border-border-subtle bg-surface-300/60 leading-relaxed italic">
          "{metadata.prompt}"
        </div>
      )}

      {/* Fullscreen Zoom Modal for Images */}
      {isZoomed && type === "image" && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img src={url} alt="Fullscreen Asset" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
