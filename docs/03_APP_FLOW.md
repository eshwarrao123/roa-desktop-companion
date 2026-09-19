# Application Flow Document

## Project: ROA — Desktop Companion/Pet Application

---

## 1. Application Startup Flow

```
User launches ROA (shortcut / startup / executable)
         │
         ▼
┌────────────────────────────────────────────┐
│ Main Process Initialization                 │
│ 1. Parse command line args                  │
│ 2. Initialize logging                       │
│ 3. Create/connect SQLite DB                 │
│ 4. Run migrations (if needed)               │
│ 5. Load settings from DB                    │
│ 6. Initialize Character Registry            │
│    - Scan builtin characters                │
│    - Scan imported characters               │
│ 7. Initialize Reminder Engine               │
│    - Load enabled reminders                 │
│    - Schedule next runs                     │
│    - Start watchdog timer (30s)             │
│ 8. Initialize AI Providers                  │
│    - Check Gemini credentials (safeStorage) │
│    - Probe Ollama (localhost:11434)         │
│    - Set active provider or DisabledProvider│
│ 9. Initialize System Tray                   │
│ 10. Register global shortcuts (if any)      │
│ 11. Create Pet Window                       │
│ 12. Set launch-at-login (if enabled)        │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Pet Window Loads                            │
│ 1. Load preload script (contextBridge)      │
│ 2. Load React app (PetRenderer)             │
│ 3. Fetch active character manifest          │
│ 4. Load sprite assets                       │
│ 5. Initialize animation engine              │
│ 6. Start behavior loop                      │
│ 7. Connect to main process events           │
└────────────────────────────────────────────┘
         │
         ▼
    [Application Running]
```

---

## 2. Pet Window Lifecycle

### 2.1 States

```
┌─────────────┐     create      ┌─────────────┐
│  Non-Existent │ ──────────────▶ │   Loading   │
└─────────────┘                 └─────────────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │   Ready     │ ◀──────────────┐
                               └─────────────┘                │
                                      │                       │
                    ┌─────────────────┼─────────────────┐    │
                    ▼                 ▼                 ▼    │
             ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
             │  Idle       │  │  Walking    │  │  Speaking   │ │
             └─────────────┘  └─────────────┘  └─────────────┘ │
                    │                 │                 │      │
                    ▼                 ▼                 ▼      │
             ┌─────────────────────────────────────────────┐  │
             │              Interactive                    │  │
             │  (User drags, clicks, hovers, right-clicks) │  │
             └─────────────────────────────────────────────┘  │
                    │                                        │
                    ▼                                        │
             ┌─────────────┐                                  │
             │  Hidden     │  (User hides via tray/menu)     │
             └─────────────┘                                  │
                    │                                        │
                    └────────────────────────────────────────┘
```

### 2.2 Behavior Loop (Renderer)

```typescript
// Simplified behavior state machine
type PetState = 'idle' | 'walking' | 'sleeping' | 'speaking' | 'reacting';

function behaviorLoop() {
  const currentState = getCurrentState();
  const mood = getCurrentMood();
  const now = Date.now();

  switch (currentState) {
    case 'idle':
      if (shouldWalk(now, mood)) {
        startWalking(randomDirection(), randomDistance());
      } else if (shouldSpeak(now, mood)) {
        showSpeechBubble(getRandomIdleMessage(mood));
      } else {
        playAnimation('idle');
        scheduleNextIdleCheck();
      }
      break;

    case 'walking':
      if (reachedDestination()) {
        setState('idle');
      } else {
        updatePosition();
      }
      break;

    case 'speaking':
      if (speechBubbleDismissed()) {
        setState('idle');
      }
      break;

    case 'reacting':
      if (animationComplete()) {
        setState('idle');
      }
      break;
  }
}
```

---

## 3. Reminder Engine Flow

### 3.1 Reminder Creation (User → AI → Engine)

```
User: "Remind me to drink water every 30 minutes"
         │
         ▼
┌────────────────────────────────────────────┐
│ AI Provider (if configured)                 │
│ 1. Receives user message + tool definitions │
│ 2. Generates tool call:                     │
│    create_reminder({                        │
│      title: "Drink water",                  │
│      schedule_type: "interval",             │
│      schedule_value: "PT30M",               │
│      timezone: "local"                      │
│    })                                       │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Tool Execution Pipeline (Main Process)      │
│ 1. Allowlist check: "create_reminder" ✓    │
│ 2. Zod validation: schema matches ✓        │
│ 3. Permission check: reminders:write ✓     │
│ 4. Execute:                                 │
│    - Insert into reminders table            │
│    - Calculate next_run_at                  │
│    - Schedule setTimeout                    │
│    - Return created reminder                │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ AI Response                                 │
│ "I've set a reminder to drink water every  │
│ 30 minutes. Next reminder at 2:30 PM."     │
└────────────────────────────────────────────┘
```

### 3.2 Reminder Trigger Flow

```
[Timer fires / Watchdog detects due reminder]
         │
         ▼
┌────────────────────────────────────────────┐
│ ReminderEngine.triggerReminder(id)          │
│ 1. Begin SQLite transaction                 │
│ 2. UPDATE reminders                         │
│    SET last_run_at = now,                   │
│        next_run_at = calculateNext(now),    │
│        updated_at = now                     │
│    WHERE id = ?                             │
│ 3. INSERT INTO reminder_history             │
│    (id, reminder_id, triggered_at, action)  │
│    VALUES (?, ?, now, 'triggered')          │
│ 4. Commit transaction                       │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Notification Delivery                       │
│ 1. Windows Toast Notification               │
│ 2. Pet Window: show speech bubble           │
│ 3. Play notification sound (if enabled)     │
│ 4. Update tray tooltip (optional)           │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Reschedule                                  │
│ scheduleNextRun(updatedReminder)            │
└────────────────────────────────────────────┘
```

### 3.3 Watchdog Recovery Flow

```
[Every 30 seconds]
         │
         ▼
┌────────────────────────────────────────────┐
│ Watchdog.check()                            │
│ 1. SELECT * FROM reminders                  │
│    WHERE enabled = 1                        │
│    AND next_run_at < (now - 60000)          │  -- 1 min grace
│ 2. For each missed reminder:                │
│    - Log warning                            │
│    - triggerReminder(id)                    │
│    - (triggerReminder handles reschedule)   │
└────────────────────────────────────────────┘
```

### 3.4 Sleep/Resume Handling

```
[Windows Sleep]                    [Windows Resume]
         │                              │
         ▼                              ▼
┌────────────────────┐         ┌────────────────────┐
│ Timers paused by   │         │ powerMonitor emits │
│ OS automatically   │         │ 'resume' event     │
│                    │         │                    │
│ next_run_at values │         │ Watchdog runs      │
│ persist in SQLite  │         │ immediately        │
└────────────────────┘         │ Missed reminders   │
                               │ fire + reschedule  │
                               └────────────────────┘
```

---

## 4. Dashboard Window Flow

### 4.1 Lazy Creation

```
User clicks tray → "Open Dashboard"
         │
         ▼
┌────────────────────────────────────────────┐
│ Main Process                                │
│ 1. Check if dashboardWindow exists          │
│ 2. If not: create BrowserWindow             │
│    - Load dashboard HTML                    │
│    - Register IPC handlers                  │
│ 3. Show window                              │
│ 4. Focus window                             │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Dashboard Renderer                          │
│ 1. Load React app (DashboardRenderer)       │
│ 2. Fetch initial data via IPC:              │
│    - settings.get()                         │
│    - character.list()                       │
│    - reminders.list()                       │
│    - timers.list()                          │
│    - ai.isConfigured()                      │
│ 3. Hydrate Zustand stores                   │
│ 4. Render UI                                │
└────────────────────────────────────────────┘
```

### 4.2 Dashboard Navigation

```
┌─────────────────────────────────────────────┐
│ Dashboard Layout                            │
│                                             │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Sidebar    │  │  Content Area       │  │
│  │             │  │                     │  │
│  │ 🏠 Home     │  │  [Active Tab]       │  │
│  │ 🐾 Pet      │  │                     │  │
│  │ ⏰ Reminders│  │  Home:              │  │
│  │ ⏱ Timers   │  │  - Pet status       │  │
│  │ 🤖 AI       │  │  - Next reminder    │  │
│  │ ⚙ Settings │  │  - Active timer     │  │
│  │             │  │                     │  │
│  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 5. AI Interaction Flow

### 5.1 Chat Message Flow (Dashboard)

```
User types in AI chat: "What's my next reminder?"
         │
         ▼
┌────────────────────────────────────────────┐
│ Dashboard Renderer                          │
│ 1. Add user message to chat history         │
│ 2. Call ipcRenderer.invoke('ai:send', msg) │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Main Process - AI Handler                   │
│ 1. Get active provider                      │
│ 2. Build system prompt + tool definitions   │
│ 3. Call provider.sendMessage()              │
└────────────────────────────────────────────┘
         │
         ▼
    [Provider returns tool call OR text]
         │
         ▼
┌────────────────────────────────────────────┐
│ If Tool Call:                               │
│ 1. Validate against allowlist               │
│ 2. Validate args with Zod                   │
│ 3. Check permissions                        │
│ 4. Execute tool                             │
│ 5. Feed result back to provider             │
│ 6. Get final response                       │
│                                             │
│ If Text Response:                           │
│ 1. Return directly                          │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Dashboard Renderer                          │
│ 1. Receive response                         │
│ 2. Add assistant message to chat history    │
│ 3. If tool results: update relevant stores  │
└────────────────────────────────────────────┘
```

### 5.2 Natural Language → Reminder Examples

| User Input | Tool Call Generated |
|------------|---------------------|
| "Remind me to take a break every hour" | `create_reminder({ title: "Take a break", schedule_type: "interval", schedule_value: "PT1H" })` |
| "Remind me to call mom tomorrow at 3pm" | `create_reminder({ title: "Call mom", schedule_type: "once", schedule_value: "2025-01-15T15:00:00" })` |
| "Set a 25 minute timer" | `start_timer({ name: "Focus", duration_ms: 1500000 })` |
| "Snooze the water reminder for 10 minutes" | `snooze_reminder({ id: "...", minutes: 10 })` |

---

## 6. Character System Flow

### 6.1 Character Selection

```
User opens Dashboard → Pet tab → Character Gallery
         │
         ▼
┌────────────────────────────────────────────┐
│ Dashboard Renderer                          │
│ 1. character.list() → all manifests         │
│ 2. Display grid with preview images         │
│ 3. User clicks character                    │
│ 4. character.setActive(id)                  │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Main Process                                │
│ 1. Update settings.activeCharacterId        │
│ 2. Broadcast 'character-changed' to windows │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Pet Window (Renderer)                       │
│ 1. Receive 'character-changed' event        │
│ 2. Load new character manifest              │
│ 3. Preload new sprite assets                │
│ 4. Swap animation definitions               │
│ 5. Reset to idle state                      │
└────────────────────────────────────────────┘
```

### 6.2 Character Import Flow

```
User: Dashboard → Pet → "Import Character Pack"
         │
         ▼
┌────────────────────────────────────────────┐
│ Main Process                                │
│ 1. dialog.showOpenDialog({                  │
│      properties: ['openFile'],              │
│      filters: [{ name: 'Character Pack',    │
│                  extensions: ['zip'] }]     │
│    })                                       │
│ 2. Validate ZIP structure:                  │
│    - manifest.json at root                  │
│    - Required animation files exist         │
│    - Manifest passes Zod schema             │
│ 3. Extract to assets/characters/imported/   │
│    /<manifest.id>/                          │
│ 4. Insert into characters table             │
│ 5. Return manifest to renderer              │
└────────────────────────────────────────────┘
```

---

## 7. Settings Flow

### 7.1 Settings Categories

```
Settings (Persisted in SQLite `settings` table)
│
├── General
│   ├── launchAtLogin: boolean
│   ├── language: string
│   └── theme: 'system' | 'light' | 'dark'
│
├── Pet Window
│   ├── alwaysOnTop: boolean
│   ├── clickThrough: boolean
│   ├── position: { x, y } | 'auto'
│   ├── behaviorIntensity: 'low' | 'medium' | 'high'
│   └── muteSounds: boolean
│
├── Reminders
│   ├── defaultSnoozeMinutes: number
│   ├── notificationSound: string
│   └── showInPetWindow: boolean
│
├── Timers
│   ├── pomodoroWorkMinutes: number
│   ├── pomodoroBreakMinutes: number
│   ├── pomodoroCycles: number
│   └── timerSound: string
│
├── AI
│   ├── enabled: boolean
│   ├── provider: 'gemini' | 'ollama' | 'disabled'
│   ├── geminiModel: string
│   └── ollamaBaseUrl: string
│
└── Advanced
    ├── debugMode: boolean
    ├── logLevel: 'error' | 'warn' | 'info' | 'debug'
    └── dataDirectory: string (read-only)
```

### 7.2 Settings Update Flow

```
User changes setting in Dashboard
         │
         ▼
┌────────────────────────────────────────────┐
│ Dashboard Renderer                          │
│ settings.update({ key: value })             │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Main Process                                │
│ 1. Validate with Zod schema                 │
│ 2. UPDATE settings SET value_json = ?       │
│    WHERE key = ?                            │
│ 3. Broadcast 'settings-changed' event       │
│ 4. Apply runtime changes:                   │
│    - launchAtLogin → app.setLoginItemSettings│
│    - alwaysOnTop → petWindow.setAlwaysOnTop│
│    - provider → reinitialize AI             │
└────────────────────────────────────────────┘
```

---

## 8. Shutdown Flow

```
User: Quit from tray / Cmd+Q / Windows shutdown
         │
         ▼
┌────────────────────────────────────────────┐
│ Main Process - before-quit                  │
│ 1. Stop reminder engine watchdog            │
│ 2. Clear all pending setTimeouts            │
│ 3. Save pet window position to settings     │
│ 4. Close dashboard window (if open)         │
│ 5. Close pet window                         │
│ 6. Destroy system tray                      │
│ 7. Close SQLite connection                  │
│ 8. Exit process                             │
└────────────────────────────────────────────┘
```

---

## 9. Error Handling Flows

### 9.1 IPC Error Propagation

```
Renderer: await ipcRenderer.invoke('reminders:create', input)
         │
         ▼
    [Main Process throws]
         │
         ▼
┌────────────────────────────────────────────┐
│ Main Process IPC Handler                    │
│ 1. Catch error                              │
│ 2. Log with context                         │
│ 3. Return structured error:                 │
│    { success: false, error: { code, message,│
│      details } }                            │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Renderer                                    │
│ 1. Check result.success                     │
│ 2. If false: show toast with error.message  │
│ 3. Log to console (dev)                     │
└────────────────────────────────────────────┘
```

### 9.2 AI Provider Failure

```
AI Request → Provider.sendMessage()
         │
         ▼
    [Provider throws / returns error]
         │
         ▼
┌────────────────────────────────────────────┐
│ AI Manager                                  │
│ 1. Log error                                │
│ 2. If rate limited: exponential backoff     │
│ 3. If auth error: mark provider unconfigured│
│ 4. If network error: retry with backoff     │
│ 5. Return user-friendly error message       │
│    "AI temporarily unavailable. Core       │
│     features still work."                   │
└────────────────────────────────────────────┘
```

---

## 10. Data Flow Summary

```
┌─────────────┐     IPC      ┌─────────────┐     SQLite      ┌─────────────┐
│  Renderer   │ ◀──────────▶ │   Main      │ ◀─────────────▶ │  Database   │
│  (Pet/Dash) │  (typed)     │  Process    │  (better-sqlite3)│  (Source of │
└─────────────┘              └─────────────┘                 │   Truth)    │
       │                            │                        └─────────────┘
       │                            │
       ▼                            ▼
┌─────────────┐              ┌─────────────┐
│  Assets/    │              │  OS APIs    │
│  Characters │              │  (notif,    │
│  (file sys) │              │   tray,     │
│  (file sys) │              │   power,    │
└─────────────┘              │ safeStorage)│
                             └─────────────┘
```

---

## 11. State Synchronization

| Flow | Storage Layer | Verification |
|------|---------------|--------------|
| Reminders | SQLite (WAL mode) | `next_run_at` index query |
| Timers | SQLite + In-memory | Drift < 50ms |
| Characters | Filesystem (assets/) | Manifest Zod schema |
| Settings | SQLite (JSON values) | Schema validation |
| AI Config | safeStorage + SQLite metadata | IPC query |
| Window Pos | SQLite settings | Boundary clamp check |
| Pet Animation State | Renderer Memory | Local only (ephemeral) |