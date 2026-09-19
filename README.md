# ROA — Desktop Companion

> A persistent, local-first desktop pet with reminders, timers, and optional AI assistance.

![ROA Preview](docs/preview.png)

---

## Project Status

**Current Phase**: Phase 5 Complete (Gemini BYOK, AI Assistant, and Safe Tool Calling)

- [x] **Phase 0 & 1**: Electron + React 19 + TypeScript + Vite Desktop Shell, transparent pet window, SQLite WAL migrations, tray lifecycle, strict IPC.
- [x] **Phase 2**: Local/Offline Reminder Engine, ONE_TIME, INTERVAL, DAILY, WEEKLY schedules, watchdog recovery, sleep/resume handling, native Windows notifications, pet reminder reactions, and Reminders dashboard UI.
- [x] **Phase 3**: Modular character manifest architecture with Zod validation, bundled original characters (`roa-cat` and `roa-bunny`), in-place character hot-switching without window destruction, autonomous behavior loop with desktop walking & screen boundary reversal, decoupled pet state (`characterId`, `mood`, `behavior`), 7 animation states, and reminder reaction flair.
- [x] **Phase 4**: Local countdown timers, Pomodoro focus engine with cycle progression, timer persistence & recovery across sleep/restart, native timer notifications, Windows startup integration, global shortcut (`Ctrl+Shift+Space`), battery awareness with low-battery spam suppression, optional idle awareness, pet click-through mode, tray enhancements, and dedicated Timers dashboard UI.
- [x] **Phase 5**: AI Assistant (Gemini BYOK using official `@google/genai` SDK, OS credential encryption with Electron `safeStorage`, 10 safe allowlisted application tools with Zod validation, conversation persistence, interactive Chat UI, Settings configuration with masked credentials, and pet reactions).

### Planning Documents

| Document | Description |
|----------|-------------|
| [`docs/01_PRD.md`](docs/01_PRD.md) | Product Requirements — Features, constraints, success metrics |
| [`docs/02_TRD.md`](docs/02_TRD.md) | Technical Requirements — Stack, architecture, schemas, APIs |
| [`docs/03_APP_FLOW.md`](docs/03_APP_FLOW.md) | Application Flows — Startup, reminder engine, pet behavior, AI |
| [`docs/04_UI_UX_BRIEF.md`](docs/04_UI_UX_BRIEF.md) | UI/UX Brief — Visual design, motion, accessibility, components |
| [`docs/05_BACKEND_SCHEMA.md`](docs/05_BACKEND_SCHEMA.md) | Backend Schema — SQLite tables, Zod schemas, IPC types |
| [`docs/06_IMPLEMENTATION_PLAN.md`](docs/06_IMPLEMENTATION_PLAN.md) | Implementation Plan — Phases, milestones, acceptance criteria |
| [`docs/07_DECISIONS.md`](docs/07_DECISIONS.md) | Decisions — Architecture choices, trade-offs, risks, open questions |

---

## Vision

ROA is a **Windows-first desktop companion** — a cute animated character that lives on your desktop, helping with reminders, timers, and productivity while being delightful to interact with.

### Core Principles

- **Local-First**: Reminders, timers, pet state work fully offline
- **AI Optional**: Gemini BYOK / Ollama are enhancements, not dependencies
- **Privacy**: No telemetry, no cloud sync, credentials in OS keychain
- **Modular Characters**: ~10 character packs via manifest + assets (user-importable)
- **Security**: Context isolation, no Node in renderer, validated IPC, allowlisted AI tools

---

## Feature Overview

### Pet Window
- Transparent, frameless, always-on-top
- Sprite-based animations (idle, walk, sleep, moods)
- Speech bubbles, drag-to-reposition, context menu
- Multiple character support with instant switching

### Reminder Engine (Core)
- Natural language → structured reminders (via AI when enabled)
- Schedules: once, interval (ISO 8601), cron
- Persistent SQLite storage with `next_run_at` source of truth
- Per-reminder `setTimeout` + 30s watchdog recovery
- Survives restart, sleep, resume, clock changes

### Timers & Pomodoro
- Countdown timers with presets
- Pomodoro cycles (configurable work/break/cycles)
- Visual progress, completion notifications

### System Integration
- System tray with dynamic menu (reminders, timers, pet status)
- Windows toast notifications with action buttons
- Launch at login (user-controlled)
- Battery/power awareness

### AI Assistant (Optional)
- Provider abstraction: Gemini (BYOK) / Ollama / Disabled
- Controlled tool calling: reminders, timers, system info
- Allowlist + Zod validation + permission checks
- Secure credential storage via `safeStorage`

### Dashboard (Lazy-Loaded)
- Reminders CRUD with filters/search
- Timer controls & history
- Character gallery & import
- Settings (pet, reminders, timers, AI, advanced)
- AI chat interface (when configured)

---

## Tech Stack (Locked)

| Layer | Technology |
|-------|------------|
| Runtime | Electron (v29+) |
| Language | TypeScript 5 (strict) |
| UI | React 19 |
| Build | Vite + electron-vite |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 |
| Database | SQLite (better-sqlite3) |
| Validation | Zod 3 |
| AI | Gemini API (BYOK) + Ollama (optional) |
| Credentials | safeStorage (OS DPAPI / Keychain) |

**Explicitly Not Used**: Rust, Tauri, embedded AI models, cloud services

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Main Process (Node.js)                                      │
│  • SQLite (better-sqlite3)                                  │
│  • Reminder Engine (scheduler + watchdog)                   │
│  • Timer Service                                            │
│  • Character Registry                                       │
│  • AI Manager (Provider abstraction)                        │
│  • System Tray, Notifications, Startup                      │
│  • Secure Credentials (safeStorage)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ contextBridge (typed IPC)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Renderer Process (React)                                    │
│  • Pet Window: Sprite animation, behavior, speech bubbles   │
│  • Dashboard: Reminders, Timers, Characters, Settings, AI   │
│  • Zustand stores + IPC hooks                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Character System

Characters are **data-driven** — no code required:

```
assets/characters/<character-id>/
├── manifest.json      # Schema-validated definition
├── preview.png        # 200x200 gallery image
├── idle.png           # Sprite strips (8 frames @ 8fps)
├── walk.png
├── sleep.png
├── happy.png
├── sad.png
└── speak.png
```

**Manifest** defines animations, moods, behaviors, asset mapping. New characters added by dropping folder — no app changes.

---

## Reminder Engine Reliability

```
User: "Remind me every 30 min"
         │
         ▼
AI (optional): create_reminder({ schedule_type: "interval", schedule_value: "PT30M" })
         │
         ▼
Tool Pipeline: Allowlist → Zod → Permission → Execute
         │
         ▼
SQLite: INSERT reminder (next_run_at calculated)
         │
         ▼
Scheduler: setTimeout(trigger, next_run_at - now)
         │
         ▼
[Timer fires] → Toast + Speech Bubble → UPDATE next_run_at → Reschedule
         │
         ▼
[Watchdog 30s]: Finds missed (next_run_at < now - 1min) → Trigger immediately
```

---

## Security Model

- **Renderer**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- **IPC**: Narrow `contextBridge` API, all inputs validated with Zod
- **AI Tools**: Hardcoded allowlist, schema validation, permission scopes
- **Credentials**: `safeStorage` → Windows DPAPI / macOS Keychain (never SQLite)
- **Filesystem**: Future — user-approved folders only, virtual paths
- **Network**: Only AI provider endpoints (user-configured)

---

## Implementation Roadmap

| Phase | Duration | Focus |
|-------|----------|-------|
| 0 | 1-2 days | Project setup, tooling, Electron + React + TypeScript |
| 1 | 3-5 days | Pet window, character system, sprite animation |
| 2 | 3-4 days | Reminder engine (SQLite, scheduler, watchdog) |
| 3 | 3-4 days | Dashboard (Reminders, Timers, Characters, Settings) |
| 4 | 2-3 days | Tray, notifications, startup, power management |
| 5 | 3-4 days | AI layer (providers, tool calling, chat UI) |
| 6 | 2-3 days | Polish, accessibility, QA, build |

**Target MVP**: ~17-25 days

---

## First Milestone: "Pet on Desktop" (End of Week 1)

1. Electron + Vite + React + TypeScript building
2. Pet window: transparent, frameless, always-on-top
3. One character (roa-cat) with idle animation
4. Draggable, snaps to screen edges
5. Context menu (Hide, Quit)
6. SQLite + migrations + settings store working
7. Lint + typecheck + tests passing

---

## Development

### Prerequisites
- Node.js 20+
- Windows 10/11 (primary target)
- pnpm (recommended) or npm

### Setup (After Implementation Begins)

```bash
# Install dependencies
pnpm install

# Development (hot reload)
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Tests
pnpm test           # Unit + integration
pnpm test:e2e       # Playwright E2E

# Build
pnpm build          # Creates dist/ROA Setup x.x.x.exe
```

---

## Project Structure

```
roa-desktop-companion/
├── docs/                      # Planning documents (7 files)
├── src/
│   ├── main/                  # Main process (Node.js)
│   │   ├── window-manager.ts
│   │   ├── tray.ts
│   │   ├── ipc/
│   │   ├── db/
│   │   ├── services/
│   │   └── utils/
│   ├── preload/               # Preload script (contextBridge)
│   └── renderer/              # React application
│       ├── src/
│       │   ├── pet/           # Pet window UI
│       │   ├── dashboard/     # Dashboard window UI
│       │   └── shared/        # Shared components/hooks
│       └── index.html
├── assets/
│   ├── characters/            # Built-in character packs
│   ├── icons/
│   └── sounds/
├── tests/
├── scripts/
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

---

## Contributing

This project is in the **planning phase**. Implementation will begin after architecture review.

When implementation starts:
1. Check `docs/06_IMPLEMENTATION_PLAN.md` for current phase
2. Follow coding standards: strict TypeScript, ESLint, Prettier
3. Write tests for new logic (Vitest for unit, Playwright for E2E)
4. All PRs must pass: `lint`, `typecheck`, `test`

---

## License

Proprietary — All rights reserved.

---

## References

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Zod](https://zod.dev/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)
- [Emil Kowalski Motion](https://emilkowal.ski/)
- [Transitions.dev](https://transitions.dev/)