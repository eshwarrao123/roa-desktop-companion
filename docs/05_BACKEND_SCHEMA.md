# Backend Schema & Data Models

## Project: ROA — Desktop Companion/Pet Application

---

## 1. Database Overview

| Aspect | Detail |
|--------|--------|
| Engine | SQLite (better-sqlite3) |
| Location | `%APPDATA%\ROA\roa.db` (Windows) |
| WAL Mode | Enabled (`PRAGMA journal_mode=WAL`) |
| Foreign Keys | Enforced (`PRAGMA foreign_keys=ON`) |
| Busy Timeout | 5000ms |
| Migrations | Versioned, run on startup |

---

## 2. Complete Schema

### 2.1 Core Tables

```sql
-- ============================================================
-- SCHEMA VERSION: 1
-- ============================================================

-- Applied via migration system on startup
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT
);

-- ============================================================
-- CHARACTERS
-- ============================================================
CREATE TABLE characters (
  id TEXT PRIMARY KEY,                    -- Manifest ID (e.g., "roa-cat")
  manifest_json TEXT NOT NULL,            -- Full manifest as JSON
  installed_at INTEGER NOT NULL,          -- Unix timestamp (ms)
  is_active INTEGER DEFAULT 0,            -- 1 = currently selected
  source TEXT NOT NULL CHECK (source IN ('builtin', 'imported')),
  UNIQUE(id)
);

CREATE INDEX idx_characters_active ON characters(is_active) WHERE is_active = 1;

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,                    -- UUID v4
  title TEXT NOT NULL,                    -- User-facing title
  description TEXT,                       -- Optional details
  schedule_type TEXT NOT NULL             -- 'once' | 'interval' | 'cron'
    CHECK (schedule_type IN ('once', 'interval', 'cron')),
  schedule_value TEXT NOT NULL,           -- ISO duration / datetime / cron expr
  timezone TEXT DEFAULT 'local',          -- IANA tz or 'local'
  enabled INTEGER DEFAULT 1,              -- 1 = active scheduling
  next_run_at INTEGER NOT NULL,           -- Unix timestamp (ms) - source of truth
  last_run_at INTEGER,                    -- Unix timestamp (ms) when last triggered
  created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  metadata_json TEXT                      -- Extensible JSON for future fields
);

CREATE INDEX idx_reminders_next_run ON reminders(next_run_at) WHERE enabled = 1;
CREATE INDEX idx_reminders_enabled ON reminders(enabled);

-- ============================================================
-- REMINDER HISTORY
-- ============================================================
CREATE TABLE reminder_history (
  id TEXT PRIMARY KEY,                    -- UUID v4
  reminder_id TEXT NOT NULL,              -- FK to reminders.id
  triggered_at INTEGER NOT NULL,          -- When reminder fired
  dismissed_at INTEGER,                   -- When user dismissed (null = pending)
  snoozed_until INTEGER,                  -- If snoozed, when it resumes
  action TEXT NOT NULL                    -- 'triggered' | 'dismissed' | 'snoozed'
    CHECK (action IN ('triggered', 'dismissed', 'snoozed')),
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);

CREATE INDEX idx_reminder_history_reminder ON reminder_history(reminder_id);
CREATE INDEX idx_reminder_history_triggered ON reminder_history(triggered_at);

-- ============================================================
-- TIMERS
-- ============================================================
CREATE TABLE timers (
  id TEXT PRIMARY KEY,                    -- UUID v4
  name TEXT NOT NULL,                     -- User-defined name
  duration_ms INTEGER NOT NULL,           -- Original duration
  remaining_ms INTEGER NOT NULL,          -- Current remaining (updated on pause/stop)
  status TEXT NOT NULL                    -- 'running' | 'paused' | 'completed' | 'cancelled'
    CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
  is_pomodoro INTEGER DEFAULT 0,          -- 1 = Pomodoro session
  pomodoro_config_json TEXT,              -- { workMs, breakMs, cycles, currentCycle, phase }
  created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL             -- Unix timestamp (ms)
);

CREATE INDEX idx_timers_status ON timers(status);

-- ============================================================
-- SETTINGS (Key-Value with JSON values)
-- ============================================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,                   -- Dot-notation: 'pet.alwaysOnTop'
  value_json TEXT NOT NULL,               -- JSON-encoded value
  updated_at INTEGER NOT NULL             -- Unix timestamp (ms)
);

-- ============================================================
-- AI PROVIDER METADATA
-- ============================================================
CREATE TABLE ai_provider_metadata (
  provider_id TEXT PRIMARY KEY,           -- 'gemini' | 'ollama' | 'disabled'
  is_configured INTEGER DEFAULT 0,        -- 1 = credentials present
  model TEXT,                             -- Active model name
  base_url TEXT,                          -- For Ollama
  updated_at INTEGER NOT NULL             -- Unix timestamp (ms)
);

-- ============================================================
-- FILESYSTEM PERMISSIONS (Future)
-- ============================================================
CREATE TABLE fs_permissions (
  id TEXT PRIMARY KEY,                    -- UUID v4
  path TEXT NOT NULL UNIQUE,              -- Absolute real path
  label TEXT,                             -- User-friendly name
  scope TEXT NOT NULL                     -- 'read' | 'read-write'
    CHECK (scope IN ('read', 'read-write')),
  granted_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  last_accessed_at INTEGER                -- Unix timestamp (ms)
);

-- ============================================================
-- EMAIL ACCOUNTS (Future)
-- ============================================================
CREATE TABLE email_accounts (
  id TEXT PRIMARY KEY,                    -- UUID v4
  provider TEXT NOT NULL                  -- 'gmail' | 'outlook'
    CHECK (provider IN ('gmail', 'outlook')),
  email TEXT NOT NULL,                    -- User email address
  encrypted_tokens TEXT NOT NULL,         -- Encrypted OAuth tokens (safeStorage)
  scopes TEXT NOT NULL,                   -- JSON array of granted scopes
  connected_at INTEGER NOT NULL,          -- Unix timestamp (ms)
  last_sync_at INTEGER,                   -- Unix timestamp (ms)
  sync_status TEXT DEFAULT 'pending'      -- 'pending' | 'synced' | 'error'
    CHECK (sync_status IN ('pending', 'synced', 'error')),
  last_error TEXT                         -- Last sync error message
);
```

### 2.2 Migration System

```typescript
// main/db/migrations.ts
interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: (db) => {
      // All CREATE TABLE statements above
      db.exec(/* schema SQL */);
    },
  },
  // Future migrations added here
];

export function runMigrations(db: Database.Database): void {
  const currentVersion = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get()?.version ?? 0;
  
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration ${migration.version}: ${migration.description}`);
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)')
          .run(migration.version, Date.now(), migration.description);
      })();
    }
  }
}
```

---

## 3. Zod Schemas (TypeScript Validation)

### 3.1 Shared Types

```typescript
// shared/types.ts
import { z } from 'zod';

// ============================================================
// BASE SCHEMAS
// ============================================================
const UUIDSchema = z.string().uuid();
const TimestampSchema = z.number().int().positive();
const JSONObjectSchema = z.record(z.unknown());

// ============================================================
// CHARACTER
// ============================================================
export const AnimationSchema = z.object({
  file: z.string(),
  frames: z.number().int().positive(),
  frameRate: z.number().positive(),
  loop: z.boolean(),
});

export const CharacterManifestSchema = z.object({
  $schema: z.string().url().optional(),
  id: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(64),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().max(128),
  description: z.string().max(512).optional(),
  preview: z.string(),
  animations: z.record(AnimationSchema),
  moods: z.array(z.string()).min(1),
  behaviors: z.object({
    idleIntervalMs: z.tuple([z.number().positive(), z.number().positive()]),
    walkProbability: z.number().min(0).max(1),
    walkDistancePx: z.tuple([z.number().positive(), z.number().positive()]),
    speechIntervalMs: z.tuple([z.number().positive(), z.number().positive()]),
  }),
  assets: z.object({
    spritesheet: z.string().optional(),
    atlas: z.string().optional(),
  }).optional(),
});

export type CharacterManifest = z.infer<typeof CharacterManifestSchema>;

// ============================================================
// REMINDERS
// ============================================================
export const ScheduleTypeSchema = z.enum(['once', 'interval', 'cron']);

export const ReminderSchema = z.object({
  id: UUIDSchema,
  title: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  schedule_type: ScheduleTypeSchema,
  schedule_value: z.string().min(1), // Validated per type
  timezone: z.string().default('local'),
  enabled: z.boolean().default(true),
  next_run_at: TimestampSchema,
  last_run_at: TimestampSchema.optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  metadata_json: JSONObjectSchema.optional(),
});

export const CreateReminderInputSchema = z.object({
  title: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  schedule_type: ScheduleTypeSchema,
  schedule_value: z.string().min(1),
  timezone: z.string().optional(),
  enabled: z.boolean().default(true),
  metadata_json: JSONObjectSchema.optional(),
});

export const UpdateReminderInputSchema = CreateReminderInputSchema.partial();

export const ReminderFilterSchema = z.object({
  enabled: z.boolean().optional(),
  schedule_type: ScheduleTypeSchema.optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

// ============================================================
// REMINDER HISTORY
// ============================================================
export const ReminderHistorySchema = z.object({
  id: UUIDSchema,
  reminder_id: UUIDSchema,
  triggered_at: TimestampSchema,
  dismissed_at: TimestampSchema.optional(),
  snoozed_until: TimestampSchema.optional(),
  action: z.enum(['triggered', 'dismissed', 'snoozed']),
});

// ============================================================
// TIMERS
// ============================================================
export const TimerStatusSchema = z.enum(['running', 'paused', 'completed', 'cancelled']);

export const PomodoroConfigSchema = z.object({
  workMs: z.number().positive(),
  breakMs: z.number().positive(),
  cycles: z.number().int().positive(),
  currentCycle: z.number().int().nonnegative(),
  phase: z.enum(['work', 'break']),
});

export const TimerSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(64),
  duration_ms: z.number().positive(),
  remaining_ms: z.number().nonnegative(),
  status: TimerStatusSchema,
  is_pomodoro: z.boolean().default(false),
  pomodoro_config_json: PomodoroConfigSchema.optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const StartTimerInputSchema = z.object({
  name: z.string().min(1).max(64),
  duration_ms: z.number().positive(),
  is_pomodoro: z.boolean().default(false),
  pomodoro_config: PomodoroConfigSchema.optional(),
});

// ============================================================
// SETTINGS
// ============================================================
export const SettingsSchema = z.object({
  // General
  'general.launchAtLogin': z.boolean().default(false),
  'general.language': z.string().default('en'),
  'general.theme': z.enum(['system', 'light', 'dark']).default('system'),
  
  // Pet Window
  'pet.alwaysOnTop': z.boolean().default(true),
  'pet.clickThrough': z.boolean().default(false),
  'pet.position': z.union([
    z.object({ x: z.number(), y: z.number() }),
    z.literal('auto'),
  ]).default('auto'),
  'pet.behaviorIntensity': z.enum(['low', 'medium', 'high']).default('medium'),
  'pet.muteSounds': z.boolean().default(false),
  'pet.activeCharacterId': z.string().optional(),
  
  // Reminders
  'reminders.defaultSnoozeMinutes': z.number().int().positive().default(10),
  'reminders.notificationSound': z.string().default('default'),
  'reminders.showInPetWindow': z.boolean().default(true),
  
  // Timers
  'timers.pomodoroWorkMinutes': z.number().int().positive().default(25),
  'timers.pomodoroBreakMinutes': z.number().int().positive().default(5),
  'timers.pomodoroCycles': z.number().int().positive().default(4),
  'timers.timerSound': z.string().default('default'),
  
  // AI
  'ai.enabled': z.boolean().default(false),
  'ai.provider': z.enum(['gemini', 'ollama', 'disabled']).default('disabled'),
  'ai.geminiModel': z.string().default('gemini-1.5-flash'),
  'ai.ollamaBaseUrl': z.string().url().default('http://localhost:11434'),
  
  // Advanced
  'advanced.debugMode': z.boolean().default(false),
  'advanced.logLevel': z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingKey = keyof Settings;

// ============================================================
// AI
// ============================================================
export const AIProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  requiresApiKey: z.boolean(),
  models: z.array(z.string()),
  isConfigured: z.boolean(),
});

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  tool_calls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.string(),
  })).optional(),
  tool_call_id: z.string().optional(),
});

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.any(), // Zod schema serialized
});

export const AIResponseSchema = z.object({
  content: z.string(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown()),
  })).optional(),
});

// ============================================================
// IPC RESPONSE WRAPPER
// ============================================================
export const IPCResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }).optional(),
  });

export type IPCResponse<T> = z.infer<ReturnType<typeof IPCResponseSchema<z.ZodTypeAny>>>;
```

---

## 4. IPC Type Definitions (contextBridge)

```typescript
// preload/types.ts
import type {
  CharacterManifest,
  ReminderSchema,
  CreateReminderInputSchema,
  UpdateReminderInputSchema,
  ReminderFilterSchema,
  ReminderHistorySchema,
  TimerSchema,
  StartTimerInputSchema,
  SettingsSchema,
  SettingKey,
  AIProviderInfoSchema,
  ChatMessageSchema,
  AIResponseSchema,
} from '../../shared/types';

export interface ElectronAPI {
  // Pet Window
  pet: {
    getPosition: () => Promise<{ x: number; y: number }>;
    setPosition: (x: number, y: number) => Promise<void>;
    setAlwaysOnTop: (flag: boolean) => Promise<void>;
    setClickThrough: (enabled: boolean) => Promise<void>;
    getBounds: () => Promise<{ width: number; height: number }>;
  };

  // Character System
  character: {
    list: () => Promise<CharacterManifest[]>;
    getActive: () => Promise<string | null>;
    setActive: (id: string) => Promise<void>;
    importPack: (filePath: string) => Promise<CharacterManifest>;
    deleteImported: (id: string) => Promise<void>;
  };

  // Reminders
  reminders: {
    list: (filter?: z.infer<typeof ReminderFilterSchema>) => Promise<{
      reminders: z.infer<typeof ReminderSchema>[];
      total: number;
    }>;
    get: (id: string) => Promise<z.infer<typeof ReminderSchema> | null>;
    create: (input: z.infer<typeof CreateReminderInputSchema>) => Promise<z.infer<typeof ReminderSchema>>;
    update: (id: string, input: z.infer<typeof UpdateReminderInputSchema>) => Promise<z.infer<typeof ReminderSchema>>;
    delete: (id: string) => Promise<void>;
    snooze: (id: string, minutes: number) => Promise<void>;
    getHistory: (reminderId: string, limit?: number) => Promise<z.infer<typeof ReminderHistorySchema>[]>;
  };

  // Timers
  timers: {
    list: () => Promise<z.infer<typeof TimerSchema>[]>;
    get: (id: string) => Promise<z.infer<typeof TimerSchema> | null>;
    start: (input: z.infer<typeof StartTimerInputSchema>) => Promise<z.infer<typeof TimerSchema>>;
    stop: (id: string) => Promise<void>;
    pause: (id: string) => Promise<void>;
    resume: (id: string) => Promise<void>;
  };

  // AI
  ai: {
    isConfigured: () => Promise<boolean>;
    getProviders: () => Promise<z.infer<typeof AIProviderInfoSchema>[]>;
    sendMessage: (messages: z.infer<typeof ChatMessageSchema>[]) => Promise<z.infer<typeof AIResponseSchema>>;
    setProvider: (providerId: string, config?: Record<string, unknown>) => Promise<void>;
    testConnection: (providerId: string) => Promise<boolean>;
  };

  // Settings
  settings: {
    get: () => Promise<z.infer<typeof SettingsSchema>>;
    getKey: <K extends SettingKey>(key: K) => Promise<z.infer<typeof SettingsSchema>[K]>;
    update: (partial: Partial<z.infer<typeof SettingsSchema>>) => Promise<void>;
    reset: (key?: SettingKey) => Promise<void>;
  };

  // System
  system: {
    getBatteryStatus: () => Promise<{
      percentage: number;
      charging: boolean;
      timeRemaining: number | null; // seconds
    }>;
    openExternal: (url: string) => Promise<void>;
    showItemInFolder: (path: string) => Promise<void>;
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<'win32' | 'darwin' | 'linux'>;
  };

  // Tray
  tray: {
    setToolTip: (text: string) => Promise<void>;
    updateMenu: () => Promise<void>;
  };

  // App Lifecycle
  app: {
    quit: () => Promise<void>;
    restart: () => Promise<void>;
    getVersion: () => Promise<string>;
    setLaunchAtLogin: (enabled: boolean) => Promise<void>;
    getLaunchAtLogin: () => Promise<boolean>;
    checkForUpdates: () => Promise<{ available: boolean; version?: string }>;
  };

  // Events (Renderer → Main)
  on: (channel: string, listener: (...args: unknown[]) => void) => void;
  off: (channel: string, listener: (...args: unknown[]) => void) => void;
  once: (channel: string, listener: (...args: unknown[]) => void) => void;
}

// Event types for type-safe listeners
export interface ElectronEvents {
  'reminder-triggered': (reminder: z.infer<typeof ReminderSchema>) => void;
  'reminder-updated': (reminder: z.infer<typeof ReminderSchema>) => void;
  'reminder-deleted': (id: string) => void;
  'timer-updated': (timer: z.infer<typeof TimerSchema>) => void;
  'timer-completed': (timer: z.infer<typeof TimerSchema>) => void;
  'character-changed': (character: CharacterManifest) => void;
  'settings-changed': (settings: Partial<z.infer<typeof SettingsSchema>>) => void;
  'ai-provider-changed': (provider: z.infer<typeof AIProviderInfoSchema>) => void;
  'pet-position-changed': (position: { x: number; y: number }) => void;
  'window-focus-changed': (focused: boolean) => void;
}
```

---

## 5. Main Process IPC Handlers

```typescript
// main/ipc/handlers.ts
import { ipcMain } from 'electron';
import { db } from '../db';
import { reminderEngine } from '../services/reminder-engine';
import { timerService } from '../services/timer-service';
import { characterRegistry } from '../services/character-registry';
import { aiManager } from '../services/ai-manager';
import { settingsStore } from '../services/settings-store';
import { validateInput } from '../utils/validation';

// Reminder Handlers
ipcMain.handle('reminders:list', async (_event, filter) => {
  const validated = validateInput(ReminderFilterSchema, filter);
  return reminderEngine.list(validated);
});

ipcMain.handle('reminders:get', async (_event, id) => {
  return reminderEngine.get(id);
});

ipcMain.handle('reminders:create', async (_event, input) => {
  const validated = validateInput(CreateReminderInputSchema, input);
  return reminderEngine.create(validated);
});

ipcMain.handle('reminders:update', async (_event, id, input) => {
  const validated = validateInput(UpdateReminderInputSchema, input);
  return reminderEngine.update(id, validated);
});

ipcMain.handle('reminders:delete', async (_event, id) => {
  return reminderEngine.delete(id);
});

ipcMain.handle('reminders:snooze', async (_event, id, minutes) => {
  return reminderEngine.snooze(id, minutes);
});

ipcMain.handle('reminders:history', async (_event, reminderId, limit = 50) => {
  return reminderEngine.getHistory(reminderId, limit);
});

// Timer Handlers
ipcMain.handle('timers:list', async () => {
  return timerService.list();
});

ipcMain.handle('timers:start', async (_event, input) => {
  const validated = validateInput(StartTimerInputSchema, input);
  return timerService.start(validated);
});

ipcMain.handle('timers:stop', async (_event, id) => {
  return timerService.stop(id);
});

ipcMain.handle('timers:pause', async (_event, id) => {
  return timerService.pause(id);
});

ipcMain.handle('timers:resume', async (_event, id) => {
  return timerService.resume(id);
});

// Character Handlers
ipcMain.handle('character:list', async () => {
  return characterRegistry.listAll();
});

ipcMain.handle('character:getActive', async () => {
  return characterRegistry.getActiveId();
});

ipcMain.handle('character:setActive', async (_event, id) => {
  return characterRegistry.setActive(id);
});

ipcMain.handle('character:importPack', async (_event, filePath) => {
  return characterRegistry.importPack(filePath);
});

// Settings Handlers
ipcMain.handle('settings:get', async () => {
  return settingsStore.getAll();
});

ipcMain.handle('settings:update', async (_event, partial) => {
  return settingsStore.update(partial);
});

// AI Handlers
ipcMain.handle('ai:isConfigured', async () => {
  return aiManager.isConfigured();
});

ipcMain.handle('ai:getProviders', async () => {
  return aiManager.getProviders();
});

ipcMain.handle('ai:sendMessage', async (_event, messages) => {
  return aiManager.sendMessage(messages);
});

// System Handlers
ipcMain.handle('system:getBatteryStatus', async () => {
  return systemService.getBatteryStatus();
});

// ... etc
```

---

## 6. Data Access Patterns

### 6.1 Reminder Engine Queries

```typescript
// main/services/reminder-engine/queries.ts
const sql = {
  // Get all enabled reminders for scheduling
  getEnabledForScheduling: db.prepare(`
    SELECT * FROM reminders 
    WHERE enabled = 1 
    ORDER BY next_run_at ASC
  `),

  // Get due reminders (watchdog)
  getDueReminders: db.prepare(`
    SELECT * FROM reminders 
    WHERE enabled = 1 
    AND next_run_at < ?
    ORDER BY next_run_at ASC
  `),

  // Get next run time for a reminder
  getNextRunAt: db.prepare(`
    SELECT next_run_at FROM reminders WHERE id = ?
  `),

  // Update next_run_at after trigger
  updateNextRun: db.prepare(`
    UPDATE reminders 
    SET last_run_at = ?, next_run_at = ?, updated_at = ?
    WHERE id = ?
  `),

  // Insert history
  insertHistory: db.prepare(`
    INSERT INTO reminder_history (id, reminder_id, triggered_at, action)
    VALUES (?, ?, ?, 'triggered')
  `),

  // Update history on dismiss/snooze
  updateHistoryDismiss: db.prepare(`
    UPDATE reminder_history 
    SET dismissed_at = ?, action = 'dismissed'
    WHERE reminder_id = ? AND dismissed_at IS NULL
    ORDER BY triggered_at DESC LIMIT 1
  `),

  updateHistorySnooze: db.prepare(`
    UPDATE reminder_history 
    SET snoozed_until = ?, action = 'snoozed'
    WHERE reminder_id = ? AND dismissed_at IS NULL
    ORDER BY triggered_at DESC LIMIT 1
  `),

  // List with pagination
  list: db.prepare(`
    SELECT * FROM reminders 
    WHERE (:enabled IS NULL OR enabled = :enabled)
    AND (:schedule_type IS NULL OR schedule_type = :schedule_type)
    AND (:search IS NULL OR title LIKE '%' || :search || '%' OR description LIKE '%' || :search || '%')
    ORDER BY next_run_at ASC
    LIMIT :limit OFFSET :offset
  `),

  count: db.prepare(`
    SELECT COUNT(*) as count FROM reminders 
    WHERE (:enabled IS NULL OR enabled = :enabled)
    AND (:schedule_type IS NULL OR schedule_type = :schedule_type)
    AND (:search IS NULL OR title LIKE '%' || :search || '%' OR description LIKE '%' || :search || '%')
  `),
};
```

### 6.2 Timer Service Queries

```typescript
// main/services/timer-service/queries.ts
const sql = {
  list: db.prepare(`SELECT * FROM timers ORDER BY created_at DESC`),
  get: db.prepare(`SELECT * FROM timers WHERE id = ?`),
  
  create: db.prepare(`
    INSERT INTO timers (id, name, duration_ms, remaining_ms, status, is_pomodoro, pomodoro_config_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'running', ?, ?, ?, ?)
  `),

  updateStatus: db.prepare(`
    UPDATE timers SET status = ?, remaining_ms = ?, updated_at = ? WHERE id = ?
  `),

  updateRemaining: db.prepare(`
    UPDATE timers SET remaining_ms = ?, updated_at = ? WHERE id = ?
  `),

  delete: db.prepare(`DELETE FROM timers WHERE id = ?`),
};
```

---

## 7. Settings Store Implementation

```typescript
// main/services/settings-store.ts
import { db } from '../db';
import { SettingsSchema, type Settings, type SettingKey } from '../../shared/types';

const DEFAULT_SETTINGS: Settings = {
  'general.launchAtLogin': false,
  'general.language': 'en',
  'general.theme': 'system',
  'pet.alwaysOnTop': true,
  'pet.clickThrough': false,
  'pet.position': 'auto',
  'pet.behaviorIntensity': 'medium',
  'pet.muteSounds': false,
  'pet.activeCharacterId': undefined,
  'reminders.defaultSnoozeMinutes': 10,
  'reminders.notificationSound': 'default',
  'reminders.showInPetWindow': true,
  'timers.pomodoroWorkMinutes': 25,
  'timers.pomodoroBreakMinutes': 5,
  'timers.pomodoroCycles': 4,
  'timers.timerSound': 'default',
  'ai.enabled': false,
  'ai.provider': 'disabled',
  'ai.geminiModel': 'gemini-1.5-flash',
  'ai.ollamaBaseUrl': 'http://localhost:11434',
  'advanced.debugMode': false,
  'advanced.logLevel': 'info',
};

const sql = {
  get: db.prepare(`SELECT key, value_json FROM settings WHERE key = ?`),
  getAll: db.prepare(`SELECT key, value_json FROM settings`),
  set: db.prepare(`
    INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `),
  delete: db.prepare(`DELETE FROM settings WHERE key = ?`),
};

export const settingsStore = {
  getAll(): Settings {
    const rows = sql.getAll.all() as { key: string; value_json: string }[];
    const result = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        result[row.key as SettingKey] = JSON.parse(row.value_json);
      } catch {
        // Ignore corrupt values
      }
    }
    return result;
  },

  getKey<K extends SettingKey>(key: K): Settings[K] {
    const row = sql.get.get(key) as { value_json: string } | undefined;
    if (!row) return DEFAULT_SETTINGS[key];
    try {
      return JSON.parse(row.value_json);
    } catch {
      return DEFAULT_SETTINGS[key];
    }
  },

  update(partial: Partial<Settings>): void {
    const now = Date.now();
    const transaction = db.transaction((updates: Partial<Settings>) => {
      for (const [key, value] of Object.entries(updates)) {
        sql.set.run(key, JSON.stringify(value), now);
      }
    });
    transaction(partial);
    
    // Broadcast to renderers
    // eventEmitter.emit('settings-changed', partial);
  },

  reset(key?: SettingKey): void {
    if (key) {
      const defaultValue = DEFAULT_SETTINGS[key];
      sql.set.run(key, JSON.stringify(defaultValue), Date.now());
    } else {
      db.exec(`DELETE FROM settings`);
      // Re-apply defaults on next get
    }
  },
};
```

---

## 8. Validation Utilities

```typescript
// main/utils/validation.ts
import { z } from 'zod';

export function validateInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map(i => 
      `${i.path.join('.')}: ${i.message}`
    ).join('; ');
    throw new Error(`Validation failed: ${issues}`);
  }
  return result.data;
}

// For IPC handlers that receive multiple arguments
export function validateArgs<T extends z.ZodTypeAny>(
  schema: T,
  args: unknown[]
): z.infer<T> {
  // Assuming single object argument
  if (args.length === 1 && typeof args[0] === 'object') {
    return validateInput(schema, args[0]);
  }
  throw new Error('Invalid IPC arguments: expected single object');
}
```

---

## 9. Secure Credential Storage (safeStorage)

```typescript
// main/services/credentials.ts
import { safeStorage } from 'electron';

// Note: Values encrypted via safeStorage can be stored in settings/SQLite or file as Buffer/base64
export const credentials = {
  async setGeminiKey(apiKey: string): Promise<Buffer> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }
    return safeStorage.encryptString(apiKey);
  },

  async getGeminiKey(encrypted: Buffer): Promise<string> {
    return safeStorage.decryptString(encrypted);
  },

  async setEmailTokens(tokens: object): Promise<Buffer> {
    return safeStorage.encryptString(JSON.stringify(tokens));
  },

  async getEmailTokens(encrypted: Buffer): Promise<object> {
    return JSON.parse(safeStorage.decryptString(encrypted));
  },
};
```

---

## 10. Type Exports for Renderer

```typescript
// shared/index.ts
// Single entry point for all shared types

export * from './types';
export * from './ipc-types'; // If separated
```

```typescript
// src/renderer/src/types/global.d.ts
/// <reference types="electron" />

declare global {
  interface Window {
    electronAPI: import('../../../preload/types').ElectronAPI;
  }
}
```