import { Chat, Message, AgentRun, Attachment } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BACKEND_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  }

  // Chats
  async getChats(limit = 30, cursor?: string): Promise<{ items: Chat[]; nextCursor: string | null }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return this.request(`/api/chats?${params.toString()}`);
  }

  async createChat(title?: string): Promise<Chat> {
    return this.request("/api/chats", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async getChat(
    id: string,
    cursor?: string
  ): Promise<{
    chat: Chat;
    messages: Message[];
    nextCursor: string | null;
    activeRun?: AgentRun | null;
  }> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    return this.request(`/api/chats/${id}?${params.toString()}`);
  }

  async updateChat(id: string, updates: { title?: string; isPinned?: boolean }): Promise<Chat> {
    return this.request(`/api/chats/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async deleteChat(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/chats/${id}`, {
      method: "DELETE",
    });
  }

  // Messages & Turns
  async sendMessage(
    chatId: string,
    data: {
      content: string;
      model?: string;
      planMode?: boolean;
      idempotencyKey?: string;
      attachmentIds?: string[];
    }
  ): Promise<{
    chatId: string;
    userMessage: Message;
    assistantMessage: Message;
    runId: string;
    status: string;
  }> {
    return this.request(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Transloadit & Attachments
  async getTransloaditAssembly(): Promise<{ params: string; signature: string; template_id: string }> {
    return this.request("/api/transloadit/assembly", { method: "POST" });
  }

  async createAttachment(data: {
    fileName: string;
    fileType: string;
    fileSize: number;
    url: string;
    assemblyId?: string;
    status?: "uploading" | "ready" | "failed";
  }): Promise<Attachment> {
    return this.request("/api/attachments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Runs
  async getRun(runId: string): Promise<AgentRun & { message: Message }> {
    return this.request(`/api/runs/${runId}`);
  }

  async cancelRun(runId: string): Promise<{ success: boolean }> {
    return this.request(`/api/runs/${runId}/cancel`, {
      method: "POST",
    });
  }

  // Credits
  async getCredits(): Promise<{ balance: number; history: any[] }> {
    return this.request("/api/credits");
  }

  // Waitpoints & Approvals
  async getWaitpoints(runId: string): Promise<{ waitpoints: any[] }> {
    return this.request(`/api/runs/${runId}/waitpoints`);
  }

  async resolveWaitpoint(
    runId: string,
    token: string,
    approved: boolean,
    response?: any
  ): Promise<{ success: boolean; status: string; waitpoint?: any }> {
    return this.request(`/api/runs/${runId}/waitpoints/${token}/resolve`, {
      method: "POST",
      body: JSON.stringify({ approved, response }),
    });
  }

  // Stream URL generator
  getStreamUrl(runId: string): string {
    return `${this.baseUrl}/api/runs/${runId}/stream`;
  }
}

export const apiClient = new ApiClient();
