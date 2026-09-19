import { create } from "zustand";

export interface StreamingToolState {
  toolCallId: string;
  name: string;
  input: any;
  output?: any;
  status: "running" | "completed" | "failed";
  creditsCost?: number;
  durationMs?: number;
  startedAt?: string;
}

interface AppState {
  activeChatId: string | null;
  isSidebarOpen: boolean;
  isArtifactOpen: boolean;
  artifactContent: { title: string; type: string; content: string } | null;
  activeRunId: string | null;
  streamingChatId: string | null;
  runStartedAt: string | null;
  isStreaming: boolean;
  streamingThinking: string;
  streamingText: string;
  streamingTools: StreamingToolState[];
  statusMessage: string;
  activeWaitpoint: { id: string; runId: string; token: string; type: string; payload: any } | null;

  // Actions
  setActiveChatId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleArtifact: () => void;
  setArtifactContent: (data: { title: string; type: string; content: string } | null) => void;
  startStreaming: (runId: string, chatId: string, startedAt?: string) => void;
  appendThinking: (chunk: string) => void;
  appendText: (chunk: string) => void;
  onToolStart: (data: { toolCallId: string; name: string; input: any }) => void;
  onToolEnd: (data: { toolCallId: string; name: string; output: any; creditsCost?: number; durationMs?: number }) => void;
  setStatusMessage: (status: string) => void;
  setActiveWaitpoint: (wp: any) => void;
  stopStreaming: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeChatId: null,
  isSidebarOpen: true,
  isArtifactOpen: false,
  artifactContent: null,
  activeRunId: null,
  streamingChatId: null,
  runStartedAt: null,
  isStreaming: false,
  streamingThinking: "",
  streamingText: "",
  streamingTools: [],
  statusMessage: "",
  activeWaitpoint: null,

  setActiveChatId: (id) => set({ activeChatId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleArtifact: () => set((state) => ({ isArtifactOpen: !state.isArtifactOpen })),
  setArtifactContent: (data) => set({ artifactContent: data, isArtifactOpen: !!data }),
  setActiveWaitpoint: (wp) => set({ activeWaitpoint: wp }),
  startStreaming: (runId, chatId, startedAt) =>
    set({
      activeRunId: runId,
      streamingChatId: chatId,
      runStartedAt: startedAt || new Date().toISOString(),
      isStreaming: true,
      streamingThinking: "",
      streamingText: "",
      streamingTools: [],
      statusMessage: "Thinking...",
      activeWaitpoint: null,
    }),
  appendThinking: (chunk) =>
    set((state) => ({
      streamingThinking: state.streamingThinking + chunk,
    })),
  appendText: (chunk) =>
    set((state) => ({
      streamingText: state.streamingText + chunk,
      statusMessage: "Writing...",
    })),
  onToolStart: (data) =>
    set((state) => ({
      streamingTools: [
        ...state.streamingTools.filter((t) => t.toolCallId !== data.toolCallId),
        { ...data, status: "running", startedAt: new Date().toISOString() },
      ],
      statusMessage: `Running ${data.name}...`,
    })),
  onToolEnd: (data) =>
    set((state) => ({
      streamingTools: state.streamingTools.map((t) =>
        t.toolCallId === data.toolCallId
          ? {
              ...t,
              output: data.output,
              creditsCost: data.creditsCost,
              durationMs: data.durationMs,
              status: "completed",
            }
          : t
      ),
      statusMessage: `Finished ${data.name}`,
    })),
  setStatusMessage: (status) => set({ statusMessage: status }),
  stopStreaming: () =>
    set({
      isStreaming: false,
      activeRunId: null,
      streamingChatId: null,
      streamingThinking: "",
      streamingText: "",
      streamingTools: [],
      statusMessage: "",
    }),
}));
