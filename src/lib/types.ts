export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; durationMs?: number }
  | { type: "tool_call"; toolCallId: string; name: string; input: any }
  | { type: "tool_result"; toolCallId: string; name: string; output?: any; isError?: boolean; creditsCost?: number };

export interface Attachment {
  id: string;
  userId: string;
  messageId?: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  assemblyId?: string | null;
  status: "uploading" | "ready" | "failed";
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: ContentBlock[];
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  chatId: string;
  messageId: string;
  idempotencyKey: string;
  status: "queued" | "running" | "waiting" | "completed" | "failed" | "cancelled";
  model: string;
  routedModel?: string | null;
  promptTokens: number;
  completionTokens: number;
  creditsCost: number;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}
