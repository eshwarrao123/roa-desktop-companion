import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema for ROA desktop shell',
    up: (db: Database.Database) => {
      db.exec(`
        -- Schema Version table
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at INTEGER NOT NULL,
          description TEXT
        );

        -- Settings table (key-value with JSON values)
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- Characters table
        CREATE TABLE IF NOT EXISTS characters (
          id TEXT PRIMARY KEY,
          manifest_json TEXT NOT NULL,
          installed_at INTEGER NOT NULL,
          is_active INTEGER DEFAULT 0,
          source TEXT NOT NULL CHECK (source IN ('builtin', 'imported'))
        );
        CREATE INDEX IF NOT EXISTS idx_characters_active ON characters(is_active) WHERE is_active = 1;

        -- Reminders table (core schema ready for Phase 2)
        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'interval', 'cron')),
          schedule_value TEXT NOT NULL,
          timezone TEXT DEFAULT 'local',
          enabled INTEGER DEFAULT 1,
          next_run_at INTEGER NOT NULL,
          last_run_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          metadata_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_reminders_next_run ON reminders(next_run_at) WHERE enabled = 1;
        CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled);

        -- Reminder History table
        CREATE TABLE IF NOT EXISTS reminder_history (
          id TEXT PRIMARY KEY,
          reminder_id TEXT NOT NULL,
          triggered_at INTEGER NOT NULL,
          dismissed_at INTEGER,
          snoozed_until INTEGER,
          action TEXT NOT NULL CHECK (action IN ('triggered', 'dismissed', 'snoozed')),
          FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_reminder_history_reminder ON reminder_history(reminder_id);

        -- Timers table
        CREATE TABLE IF NOT EXISTS timers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          duration_ms INTEGER NOT NULL,
          remaining_ms INTEGER NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
          is_pomodoro INTEGER DEFAULT 0,
          pomodoro_config_json TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_timers_status ON timers(status);

        -- AI Provider Metadata table
        CREATE TABLE IF NOT EXISTS ai_provider_metadata (
          provider_id TEXT PRIMARY KEY,
          is_configured INTEGER DEFAULT 0,
          model TEXT,
          base_url TEXT,
          updated_at INTEGER NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    description: 'Phase 2: Add one_time, interval, daily, weekly schedule types and history actions',
    up: (db: Database.Database) => {
      db.exec(`
        -- Create updated reminders table
        CREATE TABLE IF NOT EXISTS reminders_v2 (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          schedule_type TEXT NOT NULL CHECK (schedule_type IN ('one_time', 'interval', 'daily', 'weekly')),
          schedule_data TEXT NOT NULL,
          timezone TEXT DEFAULT 'local',
          enabled INTEGER DEFAULT 1,
          next_run_at INTEGER NOT NULL,
          last_run_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          metadata_json TEXT
        );

        -- Migrate data from v1 if present
        INSERT INTO reminders_v2 (id, title, description, schedule_type, schedule_data, timezone, enabled, next_run_at, last_run_at, created_at, updated_at, metadata_json)
        SELECT 
          id, 
          title, 
          description, 
          CASE 
            WHEN schedule_type = 'once' THEN 'one_time'
            WHEN schedule_type IN ('interval', 'daily', 'weekly') THEN schedule_type
            ELSE 'one_time'
          END, 
          schedule_value, 
          timezone, 
          enabled, 
          next_run_at, 
          last_run_at, 
          created_at, 
          updated_at, 
          metadata_json 
        FROM reminders;

        DROP TABLE reminders;
        ALTER TABLE reminders_v2 RENAME TO reminders;

        CREATE INDEX IF NOT EXISTS idx_reminders_next_run ON reminders(next_run_at) WHERE enabled = 1;
        CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled);

        -- Create updated reminder_history table
        CREATE TABLE IF NOT EXISTS reminder_history_v2 (
          id TEXT PRIMARY KEY,
          reminder_id TEXT NOT NULL,
          triggered_at INTEGER NOT NULL,
          dismissed_at INTEGER,
          snoozed_until INTEGER,
          action TEXT NOT NULL CHECK (action IN ('triggered', 'dismissed', 'snoozed', 'completed')),
          FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
        );

        INSERT INTO reminder_history_v2 (id, reminder_id, triggered_at, dismissed_at, snoozed_until, action)
        SELECT id, reminder_id, triggered_at, dismissed_at, snoozed_until, action FROM reminder_history;

        DROP TABLE reminder_history;
        ALTER TABLE reminder_history_v2 RENAME TO reminder_history;

        CREATE INDEX IF NOT EXISTS idx_reminder_history_reminder ON reminder_history(reminder_id);
        CREATE INDEX IF NOT EXISTS idx_reminder_history_triggered ON reminder_history(triggered_at);
      `);
    },
  },
  {
    version: 3,
    description: 'Phase 4: Upgrade timers table for countdown, Pomodoro, and recovery',
    up: (db: Database.Database) => {
      db.exec(`
        -- Create upgraded timers table
        CREATE TABLE IF NOT EXISTS timers_v2 (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('countdown', 'pomodoro')),
          duration_ms INTEGER NOT NULL,
          started_at INTEGER,
          ends_at INTEGER,
          remaining_ms INTEGER NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('idle', 'running', 'paused', 'completed', 'cancelled')),
          pomodoro_phase TEXT CHECK (pomodoro_phase IN ('focus', 'short_break', 'long_break')),
          pomodoro_cycle INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- If older timers table exists, copy data
        INSERT INTO timers_v2 (id, label, type, duration_ms, started_at, ends_at, remaining_ms, state, pomodoro_phase, pomodoro_cycle, created_at, updated_at)
        SELECT
          id,
          name,
          CASE WHEN is_pomodoro = 1 THEN 'pomodoro' ELSE 'countdown' END,
          duration_ms,
          NULL,
          NULL,
          remaining_ms,
          CASE
            WHEN status = 'running' THEN 'running'
            WHEN status = 'paused' THEN 'paused'
            WHEN status = 'completed' THEN 'completed'
            ELSE 'cancelled'
          END,
          CASE WHEN is_pomodoro = 1 THEN 'focus' ELSE NULL END,
          0,
          created_at,
          updated_at
        FROM timers;

        DROP TABLE timers;
        ALTER TABLE timers_v2 RENAME TO timers;

        CREATE INDEX IF NOT EXISTS idx_timers_state ON timers(state);
        CREATE INDEX IF NOT EXISTS idx_timers_ends_at ON timers(ends_at) WHERE state = 'running';
      `);
    },
  },
  {
    version: 4,
    description: 'Phase 5: AI conversations, messages, and provider metadata',
    up: (db: Database.Database) => {
      db.exec(`
        -- AI Conversations
        CREATE TABLE IF NOT EXISTS ai_conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- AI Messages
        CREATE TABLE IF NOT EXISTS ai_messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          tool_calls_json TEXT,
          tool_results_json TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages(created_at);

        -- Ensure ai_provider_metadata has updated columns
        CREATE TABLE IF NOT EXISTS ai_provider_metadata_v2 (
          provider_id TEXT PRIMARY KEY,
          is_configured INTEGER DEFAULT 0,
          model TEXT,
          base_url TEXT,
          last_tested_at INTEGER,
          last_error_category TEXT,
          updated_at INTEGER NOT NULL
        );

        INSERT INTO ai_provider_metadata_v2 (provider_id, is_configured, model, base_url, updated_at)
        SELECT provider_id, is_configured, model, base_url, updated_at FROM ai_provider_metadata;

        DROP TABLE ai_provider_metadata;
        ALTER TABLE ai_provider_metadata_v2 RENAME TO ai_provider_metadata;
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  // Ensure schema_version table exists first
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL,
      description TEXT
    );
  `);

  const currentVersionRow = db
    .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
    .get() as { version: number } | undefined;

  const currentVersion = currentVersionRow?.version ?? 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`[DB] Applying migration ${migration.version}: ${migration.description}`);
      db.transaction(() => {
        migration.up(db);
        db.prepare(
          'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)'
        ).run(migration.version, Date.now(), migration.description);
      })();
    }
  }
}
