"use client";

import React, { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { apiClient } from "@/lib/api-client";
import {
  ArrowUp,
  Square,
  Paperclip,
  Cpu,
  Layers,
  X,
  FileImage,
  FileVideo,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface AttachmentItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "ready" | "failed";
  attachmentId?: string;
  previewUrl?: string;
  error?: string;
}

interface ComposerProps {
  onSend: (text: string, planMode: boolean, attachmentIds?: string[]) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function Composer({ onSend, onCancel, disabled = false }: ComposerProps) {
  const [text, setText] = useState("");
  const [planMode, setPlanMode] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming } = useAppStore();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!text.trim() && attachments.length === 0) || isStreaming || disabled) return;

    const readyAttachmentIds = attachments
      .filter((a) => a.status === "ready" && a.attachmentId)
      .map((a) => a.attachmentId as string);

    onSend(text.trim(), planMode, readyAttachmentIds);
    setText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      // 500 MB limit per file (Transloadit Community plan)
      const maxBytes = 500 * 1024 * 1024;
      if (file.size > maxBytes) {
        alert(`File "${file.name}" exceeds the 500 MB Transloadit Community limit.`);
        continue;
      }

      const tempId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let previewUrl = "";
      try {
        previewUrl = URL.createObjectURL(file);
      } catch (_) {}

      const newItem: AttachmentItem = {
        id: tempId,
        file,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        progress: 30,
        status: "uploading",
        previewUrl,
      };

      setAttachments((prev) => [...prev, newItem]);

      try {
        let finalUrl = previewUrl || `https://assets.galaxy.ai/uploads/${encodeURIComponent(file.name)}`;
        let assemblyId = "";

        // 1. Attempt Transloadit signed assembly
        try {
          const assembly = await apiClient.getTransloaditAssembly().catch(() => null);
          if (assembly?.params && assembly?.signature) {
            const formData = new FormData();
            formData.append("params", assembly.params);
            formData.append("signature", assembly.signature);
            formData.append("file", file);

            const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
              method: "POST",
              body: formData,
            }).catch(() => null);

            if (uploadRes?.ok) {
              const data = await uploadRes.json();
              assemblyId = data.assembly_id || "";
              finalUrl =
                data.uploads?.[0]?.ssl_url ||
                data.results?.[":original"]?.[0]?.ssl_url ||
                data.assembly_ssl_url ||
                finalUrl;
              console.log("[Transloadit] Upload successful:", { assemblyId, finalUrl });
            }
          }
        } catch (_) {
          // Fallback to local / preview URL
        }

        setAttachments((prev) =>
          prev.map((item) => (item.id === tempId ? { ...item, progress: 75 } : item))
        );

        // 2. Persist attachment record in PostgreSQL
        const saved = await apiClient.createAttachment({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          url: finalUrl,
          assemblyId: assemblyId || undefined,
          status: "ready",
        });

        setAttachments((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  progress: 100,
                  status: "ready",
                  attachmentId: saved.id,
                }
              : item
          )
        );
      } catch (err: any) {
        console.error("Attachment upload error:", err);
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, status: "failed", error: err.message || "Upload failed" }
              : item
          )
        );
      }
    }

    // Reset input value so selecting the same file again works
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <FileImage size={14} className="text-accent-blue" />;
    if (type.startsWith("video/")) return <FileVideo size={14} className="text-accent-purple" />;
    return <FileText size={14} className="text-zinc-400" />;
  };

  const isUploading = attachments.some((a) => a.status === "uploading");

  return (
    <div className="p-4 select-none max-w-4xl mx-auto w-full">
      <div
        className={`relative glass-panel composer-shadow rounded-2xl border transition-all duration-200 ${
          planMode
            ? "border-accent-purple/60 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
            : "border-border/80 focus-within:border-accent-blue/50"
        }`}
      >
        {/* Attachment Chips */}
        {attachments.length > 0 && (
          <div className="px-3 pt-3 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-200/90 border border-border text-xs text-zinc-200 shadow-sm"
              >
                {att.previewUrl && att.type.startsWith("image/") ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="w-5 h-5 rounded object-cover border border-white/10"
                  />
                ) : (
                  getFileIcon(att.type)
                )}

                <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {(att.size / 1024).toFixed(0)} KB
                </span>

                {att.status === "uploading" && (
                  <Loader2 size={12} className="animate-spin text-accent-blue" />
                )}

                {att.status === "ready" && (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                )}

                {att.status === "failed" && (
                  <span className="text-[10px] text-red-400 font-medium">Failed</span>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="p-0.5 hover:text-white text-zinc-400 rounded transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input */}
        <div className="p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? "Agent is responding..."
                : planMode
                ? "Plan Mode: Ask agent to architect, outline steps, or research strategy..."
                : "Ask anything or type instructions..."
            }
            disabled={disabled || isStreaming}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-44 leading-relaxed"
          />
        </div>

        {/* Toolbar Footer */}
        <div className="px-3 pb-2.5 pt-1 flex items-center justify-between border-t border-border-subtle/50">
          <div className="flex items-center gap-1.5">
            {/* Native Accessible File Upload via Label */}
            <label
              htmlFor="composer-file-upload"
              title="Attach files (Transloadit Community enabled, max 500 MB)"
              className={`p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-surface-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                isStreaming || disabled ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <Paperclip size={15} />
              <input
                id="composer-file-upload"
                type="file"
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*,audio/*,application/pdf,text/*,.csv,.json"
                className="sr-only"
                disabled={isStreaming || disabled}
              />
            </label>

            {/* Plan Mode Toggle */}
            <button
              type="button"
              onClick={() => setPlanMode(!planMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                planMode
                  ? "bg-accent-purple/25 border-accent-purple/70 text-purple-200 shadow-sm"
                  : "bg-surface-200/60 border-border-subtle text-zinc-400 hover:text-zinc-300"
              }`}
            >
              <Layers size={12} className={planMode ? "text-purple-300 animate-pulse" : ""} />
              <span>{planMode ? "Plan Active" : "Plan"}</span>
            </button>

            {/* Model Badge */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-500 font-mono">
              <Cpu size={11} />
              <span>openrouter/free</span>
            </div>
          </div>

          {/* Send / Stop Action */}
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onCancel}
                title="Stop generation"
                className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <Square size={13} className="fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!text.trim() && attachments.length === 0) || isUploading || disabled}
                title="Send message"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                  (text.trim() || attachments.length > 0) && !isUploading && !disabled
                    ? planMode
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold"
                      : "bg-white text-zinc-900 hover:bg-zinc-200 font-semibold"
                    : "bg-surface-100 text-zinc-600 cursor-not-allowed border border-border-subtle"
                }`}
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
