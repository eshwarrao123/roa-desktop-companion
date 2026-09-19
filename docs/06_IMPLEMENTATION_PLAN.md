# Implementation Plan

## Project: ROA — Desktop Companion/Pet Application

---

## 1. Phase Overview

| Phase | Focus | Duration | Deliverable |
|-------|-------|----------|-------------|
| 0 | Project Setup & Tooling | 1-2 days | Build system, linting, typecheck, basic Electron app |
| 1 | Pet Window & Character System | 3-5 days | Animated pet on desktop, character loading |
| 2 | Reminder Engine (Core) | 3-4 days | SQLite-backed reminders with scheduler + watchdog |
| 3 | Dashboard Window | 3-4 days | Settings, reminders CRUD, timers, character gallery |
| 4 | System Integration | 2-3 days | Tray, notifications, startup, battery |
| 5 | AI Layer (Optional) | 3-4 days | Provider abstraction, tool calling, Gemini BYOK |
| 6 | Polish & QA | 2-3 days | Animation polish, accessibility, edge cases |
| **Total** | | **~17-25 days** | **MVP Ready** |

---

## 2. Phase 0: Project Setup & Tooling (Days 1-2)

### 2.1 Repository Initialization

```bash
# Create project structure
mkdir -p roa-desktop-companion
cd roa-desktop-companion

# Initialize with electron-vite + React + TypeScript
npm create electron-vite@latest . -- --template react-ts

# Install dependencies
npm install
npm install -D \
  tailwindcss postcss autoprefixer \
  zustand \
  better-sqlite3 @types/better-sqlite3 \
  zod \
  uuid @types/uuid \
  date-fns \
  lucide-react \
  clsx tailwind-merge

# Initialize Tailwind
npx tailwindcss init -p
```

### 2.2 Configuration Files

| File | Purpose |
|------|---------|
| `electron.vite.config.ts` | Main/preload/renderer build config |
| `tsconfig.json` | Strict TypeScript config (project references) |
| `tailwind.config.js` | Design tokens from UI/UX brief |
| `eslint.config.js` | ESLint flat config with TypeScript, React, import sorting |
| `prettier.config.js` | Prettier config |
| `.gitignore` | Node, dist, .env, build artifacts |
| `package.json` | Scripts: dev, build, lint, typecheck, test, db:migrate |

### 2.3 Project Structure

```
roa-desktop-companion/
├── docs/                          # Planning documents (this folder)
├── src/
│   ├── main/                      # Main process
│   │   ├── index.ts               # Entry point
│   │   ├── window-manager.ts      # Pet & dashboard windows
│   │   ├── tray.ts                # System tray
│   │   ├── ipc/                   # IPC handlers
│   │   │   ├── handlers.ts        # Main handlers
│   │   │   └── validation.ts      # Zod validation wrapper
│   │   ├── db/                    # Database layer
│   │   │   ├── index.ts           # Connection + migrations
│   │   │   ├── migrations/        # Schema versions
│   │   │   └── queries/           # Prepared statements
│   │   ├── services/              # Business logic
│   │   │   ├── reminder-engine/   # Scheduler + watchdog
│   │   │   ├── timer-service/     # Timer management
│   │   │   ├── character-registry/# Character loading
│   │   │   ├── ai-manager/        # Provider abstraction
│   │   │   ├── settings-store.ts  # Settings CRUD
│   │   │   ├── credentials.ts     # safeStorage wrapper
│   │   │   ├── notifications.ts   # Windows toasts
│   │   │   └── system.ts          # Battery, power monitor
│   │   └── utils/                 # Shared utilities
│   ├── preload/                   # Preload script
│   │   ├── index.ts               # contextBridge exposure
│   │   └── types.ts               # ElectronAPI types
│   ├── renderer/                  # React application
│   │   ├── src/
│   │   │   ├── pet/               # Pet window UI
│   │   │   │   ├── components/    # Sprite, SpeechBubble, PetRoot
│   │   │   │   ├── hooks/         # usePetBehavior, useAnimations
│   │   │   │   └── PetApp.tsx     # Pet window entry
│   │   │   ├── dashboard/         # Dashboard window UI
│   │   │   │   ├── pages/         # Home, Reminders, Timers, Pet, AI, Settings
│   │   │   │   ├── components/    # Shared dashboard components
│   │   │   │   ├── layout/        # Sidebar, TopBar, PageContainer
│   │   │   │   ├── hooks/         # useReminders, useTimers, etc.
│   │   │   │   ├── store/         # Zustand stores
│   │   │   │   └── DashboardApp.tsx
│   │   │   ├── shared/            # Shared components/hooks
│   │   │   │   ├── components/    # Button, Input, Modal, Card, etc.
│   │   │   │   ├── hooks/         # useIPC, useEventListener
│   │   │   │   └── utils/         # cn, formatters
│   │   │   ├── styles/            # globals.css, Tailwind imports
│   │   │   └── main.tsx           # Renderer entry (detects pet vs dashboard)
│   │   └── index.html             # Vite entry HTML
│   └── shared/                    # Shared types (main ↔ renderer)
│       ├── types.ts               # Zod schemas + inferred types
│       └── ipc-types.ts           # ElectronAPI interface
├── assets/                        # Static assets
│   ├── characters/                # Built-in character packs
│   │   ├── roa-cat/
│   │   └── roa-dog/
│   ├── icons/                     # App, tray icons
│   └── sounds/                    # Notification sounds
├── tests/                         # Test files
│   ├── unit/                      # Vitest unit tests
│   ├── integration/               # IPC, DB tests
│   └── e2e/                       # Playwright tests
├── scripts/                       # Build/release scripts
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── package.json
└── README.md
```

### 2.4 Quality Gates (Must Pass Before Each Phase)

```json
// package.json scripts
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "lint": "eslint . --ext ts,tsx --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "tsx scripts/migrate.ts",
    "prebuild": "npm run lint && npm run typecheck && npm run test"
  }
}
```

---

## 3. Phase 1: Pet Window & Character System (Days 3-7)

### 3.1 Main Process: Window Manager

```typescript
// src/main/window-manager.ts
- createPetWindow(): BrowserWindow
- createDashboardWindow(): BrowserWindow (lazy)
- positionPetWindow(): void (bottom-right, multi-monitor aware)
- persistPetPosition(): void (debounced)
- handleDisplayChanges(): void
```

### 3.2 Character Registry

```typescript
// src/main/services/character-registry/
- loadBuiltinCharacters(): void (scan assets/characters/*)
- scanImportedCharacters(): void (scan %APPDATA%/ROA/characters)
- importPack(zipPath): Promise<CharacterManifest>
- validateManifest(manifest): CharacterManifest (Zod)
- getActive(): CharacterManifest
- setActive(id): Promise<void>
- broadcastCharacterChange(): void (to all windows)
```

### 3.3 Pet Window Renderer

```typescript
// src/renderer/src/pet/
PetApp.tsx                 # Entry, providers, error boundary
├── PetRoot.tsx            # Canvas/container, drag handling
├── components/
│   ├── SpriteRenderer.tsx # Sprite animation engine
│   ├── SpeechBubble.tsx   # Animated bubble with queue
│   └── ContextMenu.tsx    # Right-click menu
├── hooks/
│   ├── useAnimations.ts   # Frame management, spritesheet parsing
│   ├── usePetBehavior.ts  # State machine: idle/walk/sleep/speak
│   ├── usePetPosition.ts  # Sync with main, drag handling
│   └── useCharacter.ts    # Load manifest, preload assets
└── types.ts               # AnimationFrame, PetState, Mood
```

### 3.4 Animation Engine (Sprite-Based)

```typescript
// Core animation loop (requestAnimationFrame)
interface AnimationController {
  currentAnimation: AnimationDef;
  frameIndex: number;
  elapsedMs: number;
  play(animName: string, loop?: boolean): void;
  update(deltaMs: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

// Sprite sheet parsing (supports manifest.frames + frameRate)
// TexturePacker atlas.json support (optional optimization)
```

### 3.5 Character Assets (MVP: 2 Characters)

```
assets/characters/
├── roa-cat/
│   ├── manifest.json
│   ├── preview.png
│   ├── idle.png (8 frames)
│   ├── walk.png (6 frames)
│   ├── sleep.png (4 frames)
│   ├── happy.png (6 frames)
│   ├── sad.png (4 frames)
│   └── speak.png (3 frames)
└── roa-dog/
    └── (same structure)
```

### 3.6 Acceptance Criteria

- [ ] Pet window opens transparent, frameless, always-on-top
- [ ] Pet animates (idle breathe loop) at 60fps
- [ ] Pet draggable, snaps to screen edges
- [ ] Right-click shows context menu
- [ ] Character switch updates pet instantly
- [ ] Speech bubbles appear/dismiss smoothly
- [ ] Two built-in characters load correctly
- [ ] Import character pack (ZIP) works

---

## 4. Phase 2: Reminder Engine (Days 8-11)

### 4.1 Database & Migrations

```typescript
// src/main/db/
index.ts         # better-sqlite3 connection, WAL, FK, migrations
migrations/
  001_initial.ts # All tables from BACKEND_SCHEMA
queries/
  reminders.ts   # Prepared statements
  timers.ts
  settings.ts
  characters.ts
```

### 4.2 Reminder Engine Core

```typescript
// src/main/services/reminder-engine/
types.ts              # Internal types, schedule calculation
scheduler.ts          # setTimeout management per reminder
watchdog.ts           # 30s interval, drift detection
calculator.ts         # nextRunAt for once/interval/cron
index.ts              # Public API: create, update, delete, list, snooze

// Key algorithm:
function calculateNextRun(reminder: Reminder, from: number): number {
  switch (reminder.schedule_type) {
    case 'once': return reminder.next_run_at; // Already absolute
    case 'interval': return addInterval(from, reminder.schedule_value); // ISO duration
    case 'cron': return nextCronMatch(from, reminder.schedule_value, reminder.timezone);
  }
}
```

### 4.3 IPC Handlers (Reminders)

```typescript
// src/main/ipc/handlers.ts
reminders:list, get, create, update, delete, snooze, history
```

### 4.4 Recovery & Resilience

```typescript
// Startup recovery
async function recoverReminders(): Promise<void> {
  const reminders = db.getEnabledForScheduling.all();
  for (const r of reminders) {
    if (r.next_run_at < Date.now()) {
      // Missed during shutdown/sleep
      await triggerReminder(r.id); // Fires immediately, reschedules
    } else {
      scheduleNextRun(r);
    }
  }
}

// Watchdog (every 30s)
setInterval(() => {
  const missed = db.getDueReminders.all(Date.now() - 60000); // 1min grace
  for (const r of missed) triggerReminder(r.id);
}, 30000);
```

### 4.5 Acceptance Criteria

- [ ] Create reminder via IPC → persisted in SQLite
- [ ] Reminder triggers at correct time (±5s)
- [ ] Windows toast + pet speech bubble on trigger
- [ ] Snooze delays next_run_at correctly
- [ ] App restart: all reminders rescheduled from next_run_at
- [ ] Sleep/resume: missed reminders fire via watchdog
- [ ] Recurring (interval) reminders repeat correctly
- [ ] One-time reminders disable after trigger
- [ ] History logged for each trigger/dismiss/snooze
- [ ] Unit tests: calculator, scheduler, watchdog

---

## 5. Phase 3: Dashboard Window (Days 12-15)

### 5.1 Dashboard Shell

```typescript
// src/renderer/src/dashboard/
DashboardApp.tsx      # Router, providers, layout
layout/
  Sidebar.tsx         # Collapsible, icon-only mode
  TopBar.tsx          # Title, breadcrumbs, actions
  PageContainer.tsx   # Animate page transitions
pages/
  Home.tsx            # Overview cards
  Reminders.tsx       # List, filters, create/edit modal
  Timers.tsx          # Active, presets, custom, history
  Pet.tsx             # Character gallery, behavior settings
  AI.tsx              # Chat interface (conditional)
  Settings.tsx        # Sectioned forms
components/
  ReminderRow.tsx     # Inline edit, toggle, snooze, delete
  TimerCard.tsx       # Progress ring, controls
  CharacterCard.tsx   # Preview, select, import button
  Modal.tsx           # Accessible dialog
```

### 5.2 State Management (Zustand)

```typescript
// src/renderer/src/dashboard/store/
useRemindersStore.ts   # reminders, filters, CRUD actions
useTimersStore.ts      # timers, active timer subscriptions
useCharacterStore.ts   # characters, active, import
useSettingsStore.ts    # settings, optimistic updates
useAIStore.ts          # messages, provider, loading
```

### 5.3 IPC Integration (Renderer)

```typescript
// src/renderer/src/shared/hooks/useIPC.ts
export function useReminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    window.electronAPI.reminders.list().then(setReminders).finally(() => setLoading(false));
    
    const unsubscribe = window.electronAPI.on('reminder-updated', (r) => 
      setReminders(prev => prev.map(x => x.id === r.id ? r : x))
    );
    return unsubscribe;
  }, []);
  
  return { reminders, loading, ...actions };
}
```

### 5.4 Acceptance Criteria

- [ ] Dashboard opens from tray/double-click
- [ ] Sidebar navigation works
- [ ] Reminders: list, create, edit, delete, snooze, filter, search
- [ ] Timers: start presets, custom, pause, stop, Pomodoro cycles
- [ ] Character gallery: preview, select, import ZIP
- [ ] Settings: all sections functional, persist to SQLite
- [ ] Real-time updates: reminder trigger → dashboard updates
- [ ] Keyboard accessible, focus management
- [ ] Responsive layout (700px - 1400px+)

---

## 6. Phase 4: System Integration (Days 16-18)

### 6.1 System Tray

```typescript
// src/main/tray.ts
- createTray(): Tray
- buildMenu(): Menu (dynamic: reminders, timers, pet status)
- updateTooltip(): void (character + next reminder/timer)
- handleClick(): toggle dashboard
```

### 6.2 Notifications

```typescript
// src/main/services/notifications.ts
- showReminderNotification(reminder): void (Windows toast + pet bubble)
- showTimerCompleteNotification(timer): void
- registerNotificationActions(): void (Snooze/Done buttons)
```

### 6.3 Startup & Power

```typescript
// src/main/services/system.ts
- setLaunchAtLogin(enabled): void (app.setLoginItemSettings)
- getBatteryStatus(): Promise<BatteryStatus> (powerMonitor)
- onPowerSuspend(): void (pause timers, save state)
- onPowerResume(): void (watchdog catch-up)
```

### 6.4 Acceptance Criteria

- [ ] Tray icon visible with correct tooltip
- [ ] Tray menu shows next reminder, active timer
- [ ] Windows toast notifications work (action buttons)
- [ ] Pet speech bubble notifications work
- [ ] Launch at login toggle works
- [ ] Sleep/resume handled gracefully
- [ ] Battery status readable (for pet behavior)

---

## 7. Phase 5: AI Layer (Days 19-22)

### 7.1 Provider Abstraction

```typescript
// src/main/services/ai-manager/
types.ts              # AIProvider interface, ToolDefinition
providers/
  gemini.ts           # GeminiProvider (BYOK)
  ollama.ts           # OllamaProvider (local)
  disabled.ts         # DisabledProvider (no-op)
tool-registry.ts      # Allowlist, Zod schemas, execute()
index.ts              # AIManager: provider selection, sendMessage()
```

### 7.2 Tool Definitions

```typescript
// Initial tools (all validated with Zod)
const tools = [
  create_reminder: { schema: CreateReminderInputSchema, execute: reminderEngine.create },
  list_reminders: { schema: ReminderFilterSchema, execute: reminderEngine.list },
  update_reminder: { schema: UpdateReminderInputSchema.extend({id: UUID}), execute: reminderEngine.update },
  delete_reminder: { schema: z.object({id: UUID}), execute: reminderEngine.delete },
  snooze_reminder: { schema: z.object({id: UUID, minutes: z.number()}), execute: reminderEngine.snooze },
  start_timer: { schema: StartTimerInputSchema, execute: timerService.start },
  stop_timer: { schema: z.object({id: UUID}), execute: timerService.stop },
  get_current_time: { schema: z.object({}), execute: () => new Date().toISOString() },
  get_battery_status: { schema: z.object({}), execute: system.getBatteryStatus },
  get_today_summary: { schema: z.object({}), execute: summaryService.getToday },
];
```

### 7.3 Credential Management

```typescript
// Settings → AI tab
- Gemini: Input API key → stored via safeStorage → test connection
- Ollama: Input base URL → test connection → list models
- Provider selector: radio group (Gemini / Ollama / Disabled)
```

### 7.4 AI Chat UI

```typescript
// src/renderer/src/dashboard/pages/AI.tsx
- Message list with streaming support
- Tool call visualization (pending → executing → result)
- Quick action buttons from tool results
- Provider status indicator
```

### 7.5 Acceptance Criteria

- [ ] Gemini BYOK: key stored securely, not in SQLite
- [ ] Ollama: detects local instance, lists models
- [ ] Tool calling works: AI → tool → result → AI response
- [ ] Allowlist enforced: unknown tools rejected
- [ ] Zod validation: malformed args rejected
- [ ] DisabledProvider: graceful "AI unavailable" messages
- [ ] Chat UI: streaming, tool visualization, history

---

## 8. Phase 6: Polish & QA (Days 23-25)

### 8.1 Animation Polish

- [ ] Spring physics for pet reactions
- [ ] Staggered entrance for dashboard lists
- [ ] Reduced motion support (prefers-reduced-motion)
- [ ] 60fps verified on integrated graphics

### 8.2 Accessibility

- [ ] Dashboard: full keyboard nav, ARIA labels, focus rings
- [ ] Pet: screen reader announcements for reminders
- [ ] High contrast mode (Windows setting)
- [ ] Color contrast WCAG AA

### 8.3 Edge Cases

- [ ] Multiple monitors: pet position, DPI scaling
- [ ] Long reminder titles: truncation, tooltip
- [ ] Many reminders: virtualized list
- [ ] Corrupt character manifest: graceful error
- [ ] Missing Ollama: clear error, fallback to disabled
- [ ] Network failure during AI: retry + offline banner

### 8.4 Testing

```bash
# Unit tests
npm run test              # Vitest: scheduler, calculator, validation

# Integration tests
npm run test:integration  # IPC handlers, DB operations

# E2E tests
npm run test:e2e          # Playwright: full flows
```

### 8.5 Build & Distribution

```bash
# Build installer
npm run build             # electron-builder → dist/ROA Setup x.x.x.exe

# Verify
- Cold start < 3s
- Pet window memory < 50MB
- Dashboard memory < 100MB
- Installer size < 150MB
```

---

## 9. Dependencies & Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Electron version breaks API | Low | High | Pin Electron version, test upgrades |
| `better-sqlite3` native build fails | Low | High | Use prebuilt binaries / `@electron/rebuild` |
| `safeStorage` fails on unsupported OS | Low | Medium | Graceful error handling, prompt user |
| Sprite animation performance | Low | Medium | Canvas 2D, requestAnimationFrame, profile |
| Windows toast actions not working | Medium | Medium | Test on Win10/11, fallback to pet bubble |
| AI tool calling unreliable | Medium | High | Robust validation, clear error messages |
| Character asset loading slow | Low | Medium | Preload, lazy-load, atlas optimization |

---

## 10. Post-MVP Backlog (Not in Scope)

| Feature | Effort | Dependencies |
|---------|--------|--------------|
| Filesystem access (search_files tool) | Medium | Permission UI, sandboxed FS |
| Gmail integration | High | OAuth, Google Cloud project |
| Outlook integration | High | Azure AD app, Graph API |
| Licensed character packs | Legal | Rights acquisition |
| Plugin system | High | Architecture review |
| Cloud sync | Very High | Backend, auth, conflict resolution |
| macOS/Linux support | High | Platform-specific code paths |
| Pet interactions (petting, feeding) | Medium | Animation state machine expansion |
| Reminder templates/presets | Low | UI only |
| Export/import data | Low | JSON serialization |

---

## 11. Team & Parallelization

| Role | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|------|---------|---------|---------|---------|---------|---------|---------|
| Electron/TS Engineer | Setup, Config | Pet Window, Main | DB, Engine | IPC, Dashboard | Tray, System | AI Providers | Polish, QA |
| React Engineer | - | Pet Renderer | - | Dashboard UI | - | AI Chat UI | Polish, A11y |
| QA/Designer | - | Asset prep | Test cases | Design review | - | UX review | Playwright, A11y audit |

**Recommended**: 1 senior full-stack (Electron + React) + 1 React specialist + designer (part-time)

---

## 12. First Coding Milestone (Phase 0 + 1 Start)

### Goal: "Pet on Desktop" — End of Week 1

**Must Have:**
1. Electron + Vite + React + TypeScript building
2. Pet window: transparent, frameless, always-on-top
3. One character (roa-cat) with idle animation
4. Pet draggable, snaps to edges
5. Basic context menu (Hide, Quit)
6. SQLite connection + migrations running
7. Settings store (get/update) working
8. Lint + typecheck + tests passing in CI

**Nice to Have:**
- Character switcher (roa-cat ↔ roa-dog)
- Speech bubble component
- Dashboard window shell (empty)

### Day-by-Day (Week 1)

| Day | Tasks |
|-----|-------|
| 1 | Repo init, electron-vite, Tailwind, ESLint, Prettier, Git |
| 2 | Main process: window manager, pet window config, preload bridge |
| 3 | Renderer: PetApp, SpriteRenderer, useAnimations hook |
| 4 | Character registry: manifest loading, asset scanning |
| 5 | Drag handling, edge snap, context menu, position persist |
| 6 | Second character, character switch IPC |
| 7 | Polish: 60fps, speech bubble, lint/typecheck/test pass |

---

## 13. Definition of Done (Per Phase)

| Checklist Item | Required |
|----------------|----------|
| Code compiles (tsc --noEmit) | ✅ |
| ESLint passes (0 warnings) | ✅ |
| Unit tests pass | ✅ |
| Integration tests pass | ✅ |
| Manual verification completed | ✅ |
| Documentation updated (if API changed) | ✅ |
| No console errors in devtools | ✅ |
| Memory stable over 30min | ✅ |