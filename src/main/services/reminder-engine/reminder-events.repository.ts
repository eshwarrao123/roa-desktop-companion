import Database from 'better-sqlite3';
import { getDb } from '../../db';
import { ReminderHistory, ReminderHistoryAction } from '@shared/types/reminders';

interface HistoryRow {
  id: string;
  reminder_id: string;
  triggered_at: number;
  dismissed_at: number | null;
  snoozed_until: number | null;
  action: string;
}

function mapRowToHistory(row: HistoryRow): ReminderHistory {
  return {
    id: row.id,
    reminder_id: row.reminder_id,
    triggered_at: row.triggered_at,
    dismissed_at: row.dismissed_at,
    snoozed_until: row.snoozed_until,
    action: row.action as ReminderHistoryAction,
  };
}

export class ReminderEventsRepository {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb ?? getDb();
  }

  public recordFired(reminderId: string, timestamp: number = Date.now()): ReminderHistory {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.db.prepare(`
      INSERT INTO reminder_history (id, reminder_id, triggered_at, action)
      VALUES (?, ?, ?, 'triggered')
    `).run(id, reminderId, timestamp);

    return {
      id,
      reminder_id: reminderId,
      triggered_at: timestamp,
      action: 'triggered',
    };
  }

  public recordSnoozed(
    reminderId: string,
    snoozedUntil: number,
    timestamp: number = Date.now()
  ): ReminderHistory {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.db.prepare(`
      INSERT INTO reminder_history (id, reminder_id, triggered_at, snoozed_until, action)
      VALUES (?, ?, ?, ?, 'snoozed')
    `).run(id, reminderId, timestamp, snoozedUntil);

    return {
      id,
      reminder_id: reminderId,
      triggered_at: timestamp,
      snoozed_until: snoozedUntil,
      action: 'snoozed',
    };
  }

  public recordDismissed(reminderId: string, timestamp: number = Date.now()): ReminderHistory {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.db.prepare(`
      INSERT INTO reminder_history (id, reminder_id, triggered_at, dismissed_at, action)
      VALUES (?, ?, ?, ?, 'dismissed')
    `).run(id, reminderId, timestamp, timestamp);

    return {
      id,
      reminder_id: reminderId,
      triggered_at: timestamp,
      dismissed_at: timestamp,
      action: 'dismissed',
    };
  }

  public recordCompleted(reminderId: string, timestamp: number = Date.now()): ReminderHistory {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.db.prepare(`
      INSERT INTO reminder_history (id, reminder_id, triggered_at, dismissed_at, action)
      VALUES (?, ?, ?, ?, 'completed')
    `).run(id, reminderId, timestamp, timestamp);

    return {
      id,
      reminder_id: reminderId,
      triggered_at: timestamp,
      dismissed_at: timestamp,
      action: 'completed',
    };
  }

  public getHistory(reminderId: string, limit: number = 50): ReminderHistory[] {
    const rows = this.db.prepare(`
      SELECT * FROM reminder_history
      WHERE reminder_id = ?
      ORDER BY triggered_at DESC
      LIMIT ?
    `).all(reminderId, limit) as HistoryRow[];

    return rows.map(mapRowToHistory);
  }
}
