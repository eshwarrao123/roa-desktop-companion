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
