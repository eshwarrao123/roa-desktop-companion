import Database from 'better-sqlite3';
import { getDb } from '../../db';
import { Reminder, ScheduleType, ScheduleData } from '@shared/types/reminders';

interface ReminderRow {
  id: string;
  title: string;
  description: string | null;
  schedule_type: string;
  schedule_data: string;
  timezone: string;
  enabled: number;
  next_run_at: number;
  last_run_at: number | null;
  created_at: number;
  updated_at: number;
  metadata_json: string | null;
}

function mapRowToReminder(row: ReminderRow): Reminder {
  let scheduleData: ScheduleData;
  try {
    scheduleData = JSON.parse(row.schedule_data);
  } catch {
    scheduleData = {} as ScheduleData;
  }

  let metadata: Record<string, unknown> | null = null;
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json);
    } catch {
      metadata = null;
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    schedule_type: row.schedule_type as ScheduleType,
    schedule_data: scheduleData,
    timezone: row.timezone,
    enabled: Boolean(row.enabled),
    next_run_at: row.next_run_at,
    last_run_at: row.last_run_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata_json: metadata,
  };
}

export class RemindersRepository {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb ?? getDb();
  }

  public create(reminder: Reminder): Reminder {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (
        id, title, description, schedule_type, schedule_data, timezone,
        enabled, next_run_at, last_run_at, created_at, updated_at, metadata_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      reminder.id,
      reminder.title,
      reminder.description ?? null,
      reminder.schedule_type,
      JSON.stringify(reminder.schedule_data),
      reminder.timezone ?? 'local',
      reminder.enabled ? 1 : 0,
      reminder.next_run_at,
      reminder.last_run_at ?? null,
      reminder.created_at,
      reminder.updated_at,
      reminder.metadata_json ? JSON.stringify(reminder.metadata_json) : null
    );

    return reminder;
  }

  public getById(id: string): Reminder | null {
    const row = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as ReminderRow | undefined;
    return row ? mapRowToReminder(row) : null;
  }

  public listAll(): Reminder[] {
    const rows = this.db.prepare('SELECT * FROM reminders ORDER BY next_run_at ASC').all() as ReminderRow[];
    return rows.map(mapRowToReminder);
  }

  public getEnabledReminders(): Reminder[] {
    const rows = this.db.prepare(
      'SELECT * FROM reminders WHERE enabled = 1 ORDER BY next_run_at ASC'
    ).all() as ReminderRow[];
    return rows.map(mapRowToReminder);
  }

  public getOverdueReminders(thresholdTimestamp: number = Date.now()): Reminder[] {
    const rows = this.db.prepare(
      'SELECT * FROM reminders WHERE enabled = 1 AND next_run_at <= ? ORDER BY next_run_at ASC'
    ).all(thresholdTimestamp) as ReminderRow[];
    return rows.map(mapRowToReminder);
  }

  public update(id: string, updates: Partial<Reminder>): Reminder | null {
    const current = this.getById(id);
    if (!current) return null;

    const merged: Reminder = {
      ...current,
      ...updates,
      updated_at: Date.now(),
    };

    const stmt = this.db.prepare(`
      UPDATE reminders SET
        title = ?,
        description = ?,
        schedule_type = ?,
        schedule_data = ?,
        timezone = ?,
        enabled = ?,
        next_run_at = ?,
        last_run_at = ?,
        updated_at = ?,
        metadata_json = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.title,
      merged.description ?? null,
      merged.schedule_type,
      JSON.stringify(merged.schedule_data),
      merged.timezone,
      merged.enabled ? 1 : 0,
      merged.next_run_at,
      merged.last_run_at ?? null,
      merged.updated_at,
      merged.metadata_json ? JSON.stringify(merged.metadata_json) : null,
      id
    );

    return merged;
  }

  public updateNextRun(id: string, nextRunAt: number, lastRunAt: number): void {
    const now = Date.now();
    this.db.prepare(`
      UPDATE reminders SET
        next_run_at = ?,
        last_run_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(nextRunAt, lastRunAt, now, id);
  }

  public setEnabled(id: string, enabled: boolean): void {
    const now = Date.now();
    this.db.prepare(`
      UPDATE reminders SET
        enabled = ?,
        updated_at = ?
      WHERE id = ?
    `).run(enabled ? 1 : 0, now, id);
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
