# Technical Requirements Document (TRD)

## Project: ROA — Desktop Companion/Pet Application

---

## 1. Technology Stack (Locked)

| Layer | Technology | Version Constraint |
|-------|------------|-------------------|
| Runtime | Electron | Latest stable (v29+) |
| Language | TypeScript | 5.x (strict mode) |
| UI Framework | React | 19.x |
| Build Tool | Vite + electron-vite | Latest |
| Styling | Tailwind CSS | 3.x |
| State Management | Zustand | 4.x |
| Database | SQLite (better-sqlite3) | Latest |
| Validation | Zod | 3.x |
| AI Provider (BYOK) | Google Gemini API | User-provided key |
| AI Provider (Local) | Ollama | Optional, user-managed |

**Explicitly Forbidden**: Rust, Tauri, any non-locked dependencies without architecture review.

---

## 2. Electron Architecture

### 2.1 Process Model

```
┌─────────────────────────────────────────────────────────────┐
│                        Main Process                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  SQLite     │  │  Reminder   │  │  Window Manager     │  │
│  │  (better-   │  │  Engine     │  │  - Pet Window       │  │
│  │   sqlite3)  │  │  (Scheduler│  │  - Dashboard Window │  │
│  └─────────────┘  │   + Watchdog)│  │  - Tray             │  │
│                   └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  AI Services│  │  FS Services│  │  OS Integrations    │  │
│  │  (Providers)│  │  (Scoped)   │  │  - Notifications    │  │
│  └─────────────┘  └─────────────┘  │  - Startup          │  │
│  ┌─────────────┐  ┌─────────────┐  │  - Battery          │  │
│  │  Email Svc  │  │  Credentials│  │  - Secure Storage   │  │
│  │  (Future)   │  │(safeStorage)│  └─────────────────────┘  │
│  └─────────────┘  └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
                              │ IPC (contextBridge)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Renderer Process                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Pet UI     │  │  Dashboard  │  │  Shared Components  │  │
│  │  - Sprites  │  │  - Settings │  │  - Animations       │  │
│  │  - Moods    │  │  - Reminders│  │  - Speech Bubbles   │  │
│  │  - Movement │  │  - Timers   │  │  - Character Select │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                            │ Zustand Store                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Security Configuration

```typescript
// main/window-config.ts
const petWindowConfig: BrowserWindowConstructorOptions = {
  width: 200,
  height: 200,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  hasShadow: false,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    preload: path.join(__dirname, 'preload.js'),
  },
};

const dashboardWindowConfig: BrowserWindowConstructorOptions = {
  width: 900,
  height: 700,
  transparent: false,
  frame: true,
  alwaysOnTop: false,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    preload: path.join(__dirname, 'preload.js'),
  },
};
```

### 2.3 IPC Surface (contextBridge API)

```typescript
// preload/types.ts
interface ElectronAPI {
  // Pet window management
  pet: {
    getPosition: () => Promise<{ x: number; y: number }>;
    setPosition: (x: number, y: number) => Promise<void>;
    setAlwaysOnTop: (flag: boolean) => Promise<void>;
    setClickThrough: (enabled: boolean) => Promise<void>;
  };

  // Character system
  character: {
    list: () => Promise<CharacterManifest[]>;
    getActive: () => Promise<string>;
    setActive: (id: string) => Promise<void>;
    importPack: (path: string) => Promise<CharacterManifest>;
  };

  // Reminders
  reminders: {
    list: (filter?: ReminderFilter) => Promise<Reminder[]>;
    create: (input: CreateReminderInput) => Promise<Reminder>;
    update: (id: string, input: UpdateReminderInput) => Promise<Reminder>;
    delete: (id: string) => Promise<void>;
    snooze: (id: string, minutes: number) => Promise<void>;
    getHistory: (reminderId: string) => Promise<ReminderHistory[]>;
  };

  // Timers
  timers: {
    list: () => Promise<Timer[]>;
    start: (input: StartTimerInput) => Promise<Timer>;
    stop: (id: string) => Promise<void>;
    pause: (id: string) => Promise<void>;
  };

  // AI (optional)
  ai: {
    isConfigured: () => Promise<boolean>;
    sendMessage: (message: string) => Promise<AIResponse>;
    getProviders: () => Promise<AIProviderInfo[]>;
  };

  // System
  system: {
    getBatteryStatus: () => Promise<BatteryStatus>;
    openExternal: (url: string) => Promise<void>;
    showItemInFolder: (path: string) => Promise<void>;
  };

  // Settings
  settings: {
    get: () => Promise<AppSettings>;
    update: (partial: Partial<AppSettings>) => Promise<void>;
  };

  // Tray / Lifecycle
  tray: {
    setToolTip: (text: string) => Promise<void>;
  };
  app: {
    quit: () => Promise<void>;
    restart: () => Promise<void>;
    getVersion: () => Promise<string>;
    setLaunchAtLogin: (enabled: boolean) => Promise<void>;
    getLaunchAtLogin: () => Promise<boolean>;
  };
}
```

---

## 3. Database Schema (SQLite)

### 3.1 Core Tables

```sql
-- Characters
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  manifest_json TEXT NOT NULL,  -- Full manifest stored as JSON
  installed_at INTEGER NOT NULL, -- Unix timestamp
  is_active INTEGER DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('builtin', 'imported'))
);

-- Reminders
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'interval', 'cron')),
  schedule_value TEXT NOT NULL, -- ISO interval string or cron expression
  timezone TEXT DEFAULT 'local',
  enabled INTEGER DEFAULT 1,
  next_run_at INTEGER NOT NULL, -- Unix timestamp (ms)
  last_run_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata_json TEXT -- Extensible JSON for future fields
);

-- Reminder History
CREATE TABLE reminder_history (
  id TEXT PRIMARY KEY,
  reminder_id TEXT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  triggered_at INTEGER NOT NULL,
  dismissed_at INTEGER,
  snoozed_until INTEGER,
  action TEXT CHECK (action IN ('triggered', 'dismissed', 'snoozed'))
);

-- Timers
CREATE TABLE timers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  remaining_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
  is_pomodoro INTEGER DEFAULT 0,
  pomodoro_config_json TEXT, -- { workMs, breakMs, cycles, currentCycle }
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Settings (key-value)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- AI Credentials (encrypted via safeStorage, not stored here)
-- Only metadata stored:
CREATE TABLE ai_provider_metadata (
  provider_id TEXT PRIMARY KEY,
  is_configured INTEGER DEFAULT 0,
  model TEXT,
  updated_at INTEGER
);

-- Filesystem Permissions (future)
CREATE TABLE fs_permissions (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  label TEXT,
  granted_at INTEGER NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('read', 'read-write'))
);

-- Email Accounts (future)
CREATE TABLE email_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email TEXT NOT NULL,
  encrypted_tokens TEXT NOT NULL, -- Encrypted via safeStorage
  scopes TEXT NOT NULL, -- JSON array
  connected_at INTEGER NOT NULL,
  last_sync_at INTEGER
);
```

### 3.2 Indexes

```sql
CREATE INDEX idx_reminders_next_run ON reminders(next_run_at) WHERE enabled = 1;
CREATE INDEX idx_reminder_history_reminder ON reminder_history(reminder_id);
CREATE INDEX idx_timers_status ON timers(status);
```

---

## 4. Reminder Engine Design

### 4.1 Scheduler Requirements

- **No single setInterval**: Each reminder gets its own `setTimeout` based on `next_run_at`
- **Persistence-first**: `next_run_at` is source of truth in SQLite
- **Watchdog**: Background job runs every 30s to detect missed/drifted reminders
- **Recovery**: On startup, reschedule all enabled reminders from `next_run_at`

### 4.2 Scheduler Algorithm

```
onStartup():
  load all enabled reminders from SQLite
  for each reminder:
    scheduleNextRun(reminder)

scheduleNextRun(reminder):
  now = Date.now()
  delay = max(0, reminder.next_run_at - now)
  if delay > MAX_TIMEOUT (24 days):
    // Use setInterval fallback for very long delays
    setInterval(checkAndReschedule, CHECK_INTERVAL)
  else:
    setTimeout(() => triggerReminder(reminder.id), delay)

triggerReminder(id):
  run in transaction:
    update reminders set last_run_at = now, next_run_at = calculateNext(next_run_at)
    insert into reminder_history
  showNotification()
  scheduleNextRun(updatedReminder)

watchdog():
  every 30s:
    find reminders where enabled=1 AND next_run_at < (now - GRACE_MS)
    for each: triggerReminder immediately, then reschedule
```

### 4.3 Schedule Types

| Type | `schedule_value` Format | Example |
|------|------------------------|---------|
| `once` | ISO 8601 datetime | `"2025-12-25T09:00:00"` |
| `interval` | ISO 8601 duration | `"PT30M"` (every 30 min), `"P1D"` (daily) |
| `cron` | Quartz cron expression | `"0 9 * * MON-FRI"` (9am weekdays) |

---

## 5. AI Provider Abstraction

### 5.1 Interface

```typescript
// main/ai/types.ts
interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly requiresApiKey: boolean;
  readonly models: string[];
  
  configure(credentials: ProviderCredentials): Promise<void>;
  isConfigured(): Promise<boolean>;
  
  sendMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    toolChoice: 'auto' | 'none' | { function: string }
  ): Promise<AIResponse>;
  
  validateCredentials(): Promise<boolean>;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema; // Zod schema for validation
  execute: (args: unknown, context: ToolContext) => Promise<ToolResult>;
}

interface ToolContext {
  userId: string; // Local user identifier
  permissions: string[]; // Granted permission scopes
}
```

### 5.2 Provider Implementations

| Provider | Credentials | Models | Notes |
|----------|-------------|--------|-------|
| `GeminiProvider` | API Key (safeStorage) | `gemini-1.5-pro`, `gemini-1.5-flash` | BYOK, cloud |
| `OllamaProvider` | Base URL (localhost:11434) | Dynamic (via `/api/tags`) | Local, optional |
| `DisabledProvider` | N/A | N/A | Fallback when none configured |

### 5.3 Tool Allowlist (Initial)

```typescript
const ALLOWED_TOOLS = [
  'create_reminder',
  'list_reminders', 
  'update_reminder',
  'delete_reminder',
  'snooze_reminder',
  'start_timer',
  'stop_timer',
  'get_current_time',
  'get_battery_status',
  'get_today_summary',
] as const;
```

### 5.4 Tool Execution Pipeline

```
User Message
    │
    ▼
AI Provider (Gemini/Ollama) → Tool Call Request
    │
    ▼
┌─────────────────────────────────────┐
│ Tool Allowlist Check                │
│ (name ∈ ALLOWED_TOOLS)              │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Zod Schema Validation               │
│ (parameters match tool definition)  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Permission Validation               │
│ (context.permissions includes scope)│
└─────────────────────────────────────┘
    │
    ▼
Tool Execution (in Main Process)
    │
    ▼
Result → AI Provider → Final Response
```

---

## 6. Character System Architecture

### 6.1 Character Manifest Schema

```json
{
  "$schema": "https://roa.app/schemas/character-manifest.json",
  "id": "roa-cat",
  "name": "Roa Cat",
  "version": "1.0.0",
  "author": "ROA Team",
  "description": "A curious cat companion",
  "preview": "preview.png",
  "animations": {
    "idle": { "file": "idle.png", "frames": 8, "frameRate": 8, "loop": true },
    "walk": { "file": "walk.png", "frames": 6, "frameRate": 12, "loop": true },
    "sleep": { "file": "sleep.png", "frames": 4, "frameRate": 4, "loop": true },
    "happy": { "file": "happy.png", "frames": 6, "frameRate": 10, "loop": false },
    "sad": { "file": "sad.png", "frames": 4, "frameRate": 6, "loop": false },
    "speak": { "file": "speak.png", "frames": 3, "frameRate": 8, "loop": true }
  },
  "moods": ["neutral", "happy", "sleepy", "sad", "excited"],
  "behaviors": {
    "idleIntervalMs": [5000, 15000],
    "walkProbability": 0.3,
    "walkDistancePx": [100, 300],
    "speechIntervalMs": [30000, 120000]
  },
  "assets": {
    "spritesheet": "spritesheet.png",
    "atlas": "atlas.json"
  }
}
```

### 6.2 Asset Loading

```
assets/characters/
├── roa-cat/
│   ├── manifest.json
│   ├── preview.png
│   ├── idle.png
│   ├── walk.png
│   ├── sleep.png
│   ├── happy.png
│   ├── sad.png
│   ├── speak.png
│   ├── spritesheet.png (optional, for atlas)
│   └── atlas.json (optional, TexturePacker format)
├── roa-dog/
│   └── ...
└── user-imported/
    └── my-custom-char/
        └── manifest.json
```

### 6.3 Character Registry (Main Process)

```typescript
class CharacterRegistry {
  private characters = new Map<string, CharacterManifest>();
  private activeCharacterId: string;
  
  async loadBuiltinCharacters(): Promise<void>;
  async scanImportedCharacters(): Promise<void>;
  async importPack(zipPath: string): Promise<CharacterManifest>;
  getManifest(id: string): CharacterManifest | undefined;
  listAll(): CharacterManifest[];
  setActive(id: string): Promise<void>;
  getActive(): CharacterManifest;
}
```

---

## 7. File System Access (Future)

### 7.1 Permission Model

- User selects folders via native dialog (`dialog.showOpenDialog`)
- Each granted folder gets an entry in `fs_permissions` table
- AI tools receive a **virtual path** (e.g., `/approved/project/`)
- Real paths never exposed to AI
- Path resolution validates against allowed prefixes

### 7.2 AI Tool: `search_files`

```typescript
{
  name: 'search_files',
  description: 'Search for files in user-approved folders',
  parameters: z.object({
    query: z.string(),
    folderId: z.string().optional(), // Specific approved folder
    maxResults: z.number().default(20),
  }),
  execute: async ({ query, folderId, maxResults }) => {
    const allowedPaths = await getAllowedPaths(folderId);
    // Implement safe search (no recursion beyond allowedPaths)
    // Return: [{ virtualPath, name, size, modified }]
  }
}
```

---

## 8. Email Integration (Future)

### 8.1 Architecture

- Separate OAuth flow per provider (Gmail, Outlook)
- Tokens encrypted via `safeStorage` (OS DPAPI / Keychain)
- Read-only scopes initially
- Sync runs in background, stores minimal metadata in SQLite
- AI tool: `get_recent_emails` → returns subject/sender/snippet/date

### 8.2 Security

- No email content stored in plaintext
- Tokens never leave main process
- User can revoke access anytime

---

## 9. Build & Distribution

### 9.1 electron-vite Configuration

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    entry: 'src/main/index.ts',
    build: { outDir: 'dist/main' },
  },
  preload: {
    entry: 'src/preload/index.ts',
    build: { outDir: 'dist/preload' },
  },
  renderer: {
    root: 'src/renderer',
    build: { outDir: 'dist/renderer' },
    plugins: [react(), tailwindcss()],
  },
});
```

### 9.2 Build Outputs

- `dist/win-unpacked/` — Development
- `dist/ROA Setup x.x.x.exe` — NSIS installer
- `dist/ROA x.x.x portable.exe` — Portable

### 9.3 Auto-Updates

- Electron-updater with GitHub Releases
- Silent background download, prompt on restart

---

## 10. Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Pure logic (scheduler, validation, schemas) |
| Integration | Vitest + Testcontainers | IPC, Database, AI Providers |
| E2E | Playwright | Full app flows (pet, dashboard, reminders) |
| Visual | Playwright + pixelmatch | Animation frames, UI regression |

---

## 11. Open Technical Questions

1. **Sprite Animation**: Canvas 2D vs WebGL (PixiJS) vs CSS sprites — decide in UI/UX brief
2. **Idle Detection**: Use Electron `powerMonitor` or native Windows API for "away" behavior?
3. **Multiple Monitors**: Pet window positioning logic across DPI/scaling differences
4. **Ollama Detection**: How to gracefully handle missing/not-running Ollama?
5. **Character Pack Format**: ZIP vs folder — ZIP easier for distribution, folder easier for dev