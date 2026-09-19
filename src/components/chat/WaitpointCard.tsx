"use client";

import React, { useState } from "react";
import { ShieldAlert, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface WaitpointCardProps {
  runId: string;
  token: string;
  title?: string;
  summary?: string;
  status?: "pending" | "resolved" | "expired";
  response?: { approved: boolean } | null;
  onResolved?: (approved: boolean) => void;
}

export function WaitpointCard({
  runId,
  token,
  title = "Approval Required",
  summary = "The agent paused to request your approval before continuing.",
  status: initialStatus = "pending",
  response: initialResponse = null,
  onResolved,
}: WaitpointCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decision, setDecision] = useState<boolean | null>(
    initialResponse?.approved ?? null
  );

  const handleResolve = async (approved: boolean) => {
    if (status !== "pending" || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await apiClient.resolveWaitpoint(runId, token, approved);
      setStatus("resolved");
      setDecision(approved);
      onResolved?.(approved);
    } catch (err: any) {
      console.error("Failed to resolve waitpoint:", err);
      alert(err.message || "Failed to resolve approval request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-amber-500/30 bg-amber-950/10 backdrop-blur-md p-4 max-w-xl transition-all shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
          <ShieldAlert size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Human Waitpoint
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              token: {token.slice(0, 14)}...
            </span>
          </div>

          <h4 className="text-sm font-medium text-zinc-200">{title}</h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{summary}</p>

          {/* Action or Decision Status */}
          <div className="mt-3 pt-2 border-t border-border-subtle flex items-center justify-between">
            {status === "pending" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleResolve(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  <span>Approve & Continue</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleResolve(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition-all active:scale-95 disabled:opacity-50"
                >
                  <XCircle size={13} />
                  <span>Reject</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {decision ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
                    <CheckCircle2 size={12} /> Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/30">
                    <XCircle size={12} /> Rejected
                  </span>
                )}
                <span className="text-[11px] text-zinc-500">Waitpoint resolved</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
