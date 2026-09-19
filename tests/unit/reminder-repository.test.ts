import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { RemindersRepository } from '../../src/main/services/reminder-engine/reminders.repository';
import { ReminderEventsRepository } from '../../src/main/services/reminder-engine/reminder-events.repository';
import { Reminder } from '../../src/shared/types/reminders';

describe('Reminders Repository and Events Repository', () => {
  let remindersDb: Map<string, any>;
  let historyDb: Array<any>;
  let mockDb: Database.Database;

  beforeEach(() => {
    remindersDb = new Map();
    historyDb = [];

    mockDb = {
      prepare: (sql: string) => {
        if (sql.includes('INSERT INTO reminders')) {
          return {
            run: (
              id: string,
              title: string,
              description: string | null,
              schedule_type: string,
              schedule_data: string,
              timezone: string,
              enabled: number,
              next_run_at: number,
              last_run_at: number | null,
              created_at: number,
              updated_at: number,
              metadata_json: string | null
            ) => {
              remindersDb.set(id, {
                id,
                title,
                description,
                schedule_type,
                schedule_data,
                timezone,
                enabled,
                next_run_at,
                last_run_at,
                created_at,
                updated_at,
                metadata_json,
              });
              return { changes: 1 };
            },
          };
        }

        if (sql.includes('SELECT * FROM reminders WHERE id = ?')) {
          return {
            get: (id: string) => remindersDb.get(id),
          };
        }

        if (sql.includes('SELECT * FROM reminders WHERE enabled = 1 AND next_run_at <= ?')) {
          return {
            all: (threshold: number) => {
              return Array.from(remindersDb.values()).filter(
                (r) => r.enabled === 1 && r.next_run_at <= threshold
              );
            },
          };
        }

        if (sql.includes('SELECT * FROM reminders WHERE enabled = 1 ORDER BY next_run_at ASC')) {
          return {
            all: () => {
              return Array.from(remindersDb.values()).filter((r) => r.enabled === 1);
            },
          };
        }

        if (sql.includes('SELECT * FROM reminders ORDER BY next_run_at ASC')) {
          return {
            all: () => Array.from(remindersDb.values()),
          };
        }

        if (sql.includes('UPDATE reminders SET') && sql.includes('next_run_at = ?')) {
          return {
            run: (nextRunAt: number, lastRunAt: number, updatedAt: number, id: string) => {
              const item = remindersDb.get(id);
              if (item) {
                item.next_run_at = nextRunAt;
                item.last_run_at = lastRunAt;
                item.updated_at = updatedAt;
              }
              return { changes: item ? 1 : 0 };
            },
          };
        }

        if (sql.includes('UPDATE reminders SET') && sql.includes('enabled = ?')) {
          return {
            run: (enabled: number, updatedAt: number, id: string) => {
              const item = remindersDb.get(id);
              if (item) {
                item.enabled = enabled;
                item.updated_at = updatedAt;
              }
              return { changes: item ? 1 : 0 };
            },
          };
        }

        if (sql.includes('DELETE FROM reminders WHERE id = ?')) {
          return {
            run: (id: string) => {
              const deleted = remindersDb.delete(id);
              return { changes: deleted ? 1 : 0 };
            },
          };
        }

        if (sql.includes('INSERT INTO reminder_history')) {
          return {
            run: (...args: any[]) => {
              historyDb.push(args);
              return { changes: 1 };
            },
          };
        }

        if (sql.includes('SELECT * FROM reminder_history')) {
          return {
            all: (reminderId: string, limit: number) => {
              return historyDb
                .filter((entry) => entry[1] === reminderId)
                .slice(0, limit)
                .map((entry) => ({
                  id: entry[0],
                  reminder_id: entry[1],
                  triggered_at: entry[2],
                  dismissed_at: entry[3] ?? null,
                  snoozed_until: entry[3] ?? null,
                  action: entry[4] ?? entry[3] ?? 'triggered',
                }));
            },
          };
        }

        return {
          run: () => ({ changes: 1 }),
          get: () => undefined,
          all: () => [],
        };
      },
    } as unknown as Database.Database;
  });

  it('creates and retrieves a reminder', () => {
    const repo = new RemindersRepository(mockDb);

    const reminder: Reminder = {
      id: 'rem-1',
      title: 'Hydrate',
      description: 'Drink a glass of water',
      schedule_type: 'interval',
      schedule_data: { intervalMinutes: 30 },
      timezone: 'local',
      enabled: true,
      next_run_at: 1700000000000,
      created_at: 1699990000000,
      updated_at: 1699990000000,
    };

    repo.create(reminder);
    const retrieved = repo.getById('rem-1');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('rem-1');
    expect(retrieved?.title).toBe('Hydrate');
    expect(retrieved?.enabled).toBe(true);
    expect(retrieved?.schedule_type).toBe('interval');
    expect(retrieved?.schedule_data).toEqual({ intervalMinutes: 30 });
  });

  it('detects overdue reminders based on threshold', () => {
    const repo = new RemindersRepository(mockDb);

    repo.create({
      id: 'rem-overdue',
      title: 'Overdue task',
      schedule_type: 'interval',
      schedule_data: { intervalMinutes: 30 },
      timezone: 'local',
      enabled: true,
      next_run_at: 1000,
      created_at: 500,
      updated_at: 500,
    });

    repo.create({
      id: 'rem-future',
      title: 'Future task',
      schedule_type: 'interval',
      schedule_data: { intervalMinutes: 30 },
      timezone: 'local',
      enabled: true,
      next_run_at: 5000,
      created_at: 500,
      updated_at: 500,
    });

    const overdue = repo.getOverdueReminders(2000);
    expect(overdue.length).toBe(1);
    expect(overdue[0].id).toBe('rem-overdue');
  });

  it('updates next_run_at and toggles enabled state', () => {
    const repo = new RemindersRepository(mockDb);

    repo.create({
      id: 'rem-toggle',
      title: 'Toggle Task',
      schedule_type: 'interval',
      schedule_data: { intervalMinutes: 15 },
      timezone: 'local',
      enabled: true,
      next_run_at: 1000,
      created_at: 500,
      updated_at: 500,
    });

    repo.updateNextRun('rem-toggle', 3000, 1000);
    expect(repo.getById('rem-toggle')?.next_run_at).toBe(3000);

    repo.setEnabled('rem-toggle', false);
    expect(repo.getById('rem-toggle')?.enabled).toBe(false);
  });

  it('records history events in ReminderEventsRepository', () => {
    const eventsRepo = new ReminderEventsRepository(mockDb);

    const fired = eventsRepo.recordFired('rem-1', 1700000000000);
    expect(fired.reminder_id).toBe('rem-1');
    expect(fired.action).toBe('triggered');

    const snoozed = eventsRepo.recordSnoozed('rem-1', 1700000600000, 1700000000000);
    expect(snoozed.reminder_id).toBe('rem-1');
    expect(snoozed.snoozed_until).toBe(1700000600000);
    expect(snoozed.action).toBe('snoozed');

    expect(historyDb.length).toBe(2);
  });
});
