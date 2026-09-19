# Galaxy Agent Frontend (`galaxy-agent-frontend`)

A pixel-perfect, production-grade Next.js 15 client cloning the live [Galaxy Agent Chat](https://app.galaxy.ai/chat) product. Features real-time token streaming, thinking drawer with live timer, interactive Magica media asset cards, human waitpoint approval overlays, and reload recovery.

---

## 🎨 Features & Highlights

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom glassmorphism, sleek dark mode, and Lucide icons
- **State Architecture**:
  - **Zustand**: Client-side UI toggles, streaming text tokens, thinking deltas, and active waitpoint states
  - **TanStack Query**: Server state caching, optimistic UI updates, and cursor-paginated chat lists
- **Real-Time Streaming**: Custom resilient Server-Sent Events (SSE) consumer with gapless database reconciliation
- **Interactive Tool Cards**:
  - `ToolInvocationCard`: Live spinning loader, duration, credit badge, and collapsible JSON viewer
  - `GeneratedAssetCard`: Full-resolution image viewer with click-to-zoom modal & HTML5 video player
  - `WaitpointCard`: Human approval overlay for Plan Mode with Approve & Continue / Reject actions
- **Media Uploads**: Transloadit Community-plan direct uploads with upload progress indicators

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env.local
```
*(By default, points to `http://localhost:3001` for the backend).*

### 3. Run Development Server
```bash
pnpm dev
# Application accessible on http://localhost:3000
```

---

## 🧪 Type Checking

```bash
pnpm tsc --noEmit
```
Compiled with 0 TypeScript errors.
