import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { RemindersRepository } from '../../src/main/services/reminder-engine/reminders.repository';
import { ReminderEventsRepository } from '../../src/main/services/reminder-engine/reminder-events.repository';
import { ReminderEngine } from '../../src/main/services/reminder-engine';
import { WindowManager } from '../../src/main/window-manager';
import type { Reminder } from '../../src/shared/types/reminders';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/mock/path',
  },
  powerMonitor: {
    on: vi.fn(),
  },
  Notification: class {
    static isSupported() {
      return true;
    }
    show() {}
  },
}));

/**
 * M10 Phase B: Reminder Reliability Integration Tests
 * 
 * These tests verify actual reminder triggering behavior, not just calculation logic.
 */
describe('ReminderEngine Reliability (M10 Phase B)', () => {
  let remindersDb: Map<string, any>;
  let eventsDb: Map<string, any>;
  let mockDb: Database.Database;
  let remindersRepo: RemindersRepository;
  let eventsRepo: ReminderEventsRepository;
  let windowManager: WindowManager;
  let engine: ReminderEngine;
  let triggerSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    remindersDb = new Map();
    eventsDb = new Map();

    mockDb = {
      prepare: (sql: string) => {
        if (sql.includes('INSERT INTO reminders')) {
          return {
            run: (...args: any[]) => {
              const [
                id, title, description, schedule_type, schedule_data_json,
                timezone, enabled, next_run_at, last_run_at,
                created_at, updated_at, metadata_json
              ] = args;
              remindersDb.set(id, {
                id, title, description, schedule_type,
                schedule_data: schedule_data_json,
                timezone, enabled, next_run_at, last_run_at,
                created_at, updated_at,
                metadata_json: metadata_json || null,
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

        if (sql.includes('SELECT * FROM reminders WHERE enabled = 1')) {
          return {
            all: () => Array.from(remindersDb.values()).filter((r) => r.enabled),
          };
        }

        if (sql.includes('SELECT * FROM reminders WHERE enabled = 1 AND next_run_at <= ?')) {
          return {
            all: (now: number) =>
              Array.from(remindersDb.values()).filter(
                (r) => r.enabled && r.next_run_at <= now
              ),
          };
        }

        if (sql.includes('UPDATE reminders SET')) {
          return {
            run: (...args: any[]) => {
              const id = args[args.length - 1];
              const existing = remindersDb.get(id);
              if (!existing) return { changes: 0 };

              // Handle the full UPDATE from RemindersRepository.update()
              if (sql.includes('title = ?') && sql.includes('description = ?')) {
                // Full update query: title, description, schedule_type, schedule_data, timezone, enabled, next_run_at, last_run_at, updated_at, metadata_json, id
                const [title, description, schedule_type, schedule_data_json, timezone, enabled, next_run_at, last_run_at, updated_at, metadata_json] = args;
                remindersDb.set(id, {
                  ...existing,
                  title,
                  description,
                  schedule_type,
                  schedule_data: schedule_data_json,
                  timezone,
                  enabled: Boolean(enabled),
                  next_run_at: Number(next_run_at),
                  last_run_at: last_run_at ? Number(last_run_at) : null,
                  updated_at: Number(updated_at),
                  metadata_json: metadata_json || null,
                });
              } else if (sql.includes('next_run_at = ?') && sql.includes('last_run_at = ?')) {
                // updateNextRun: next_run_at, last_run_at, updated_at, id
                const [next_run_at, last_run_at, updated_at] = args;
                remindersDb.set(id, {
                  ...existing,
                  next_run_at: Number(next_run_at),
                  last_run_at: Number(last_run_at),
                  updated_at: Number(updated_at),
                });
              } else if (sql.includes('enabled = ?')) {
                // setEnabled: enabled, updated_at, id
                const [enabled, updated_at] = args;
                remindersDb.set(id, {
                  ...existing,
                  enabled: Boolean(enabled),
                  updated_at: Number(updated_at),
                });
              }

              return { changes: 1 };
            },
          };
        }

        if (sql.includes('DELETE FROM reminders WHERE id = ?')) {
          return {
            run: (id: string) => {
              remindersDb.delete(id);
              return { changes: 1 };
            },
          };
        }

        if (sql.includes('INSERT INTO reminder_events')) {
          return {
            run: (...args: any[]) => {
              const [id, reminder_id, event_type, event_data_json, occurred_at] = args;
              eventsDb.set(id, {
                id, reminder_id, event_type,
                event_data: event_data_json ? JSON.parse(event_data_json) : null,
                occurred_at,
              });
              return { changes: 1 };
            },
          };
        }

        return {
          run: () => ({ changes: 0 }),
          get: () => undefined,
          all: () => [],
        };
      },
    } as unknown as Database.Database;

    remindersRepo = new RemindersRepository(mockDb);
    eventsRepo = new ReminderEventsRepository(mockDb);
    windowManager = {
      getDashboardWindow: () => null,
      getPetWindow: () => null,
    } as unknown as WindowManager;

    engine = new ReminderEngine(remindersRepo, eventsRepo, windowManager);
    triggerSpy = vi.spyOn(engine, 'triggerReminder');
  });

  afterEach(() => {
    vi.useRealTimers();
    engine.shutdown();
  });

  describe('Real-time triggering', () => {
    it('triggers a one-time reminder at the correct time', async () => {
      const now = Date.now();
      const triggerTime = now + 5000; // 5 seconds from now

      const reminder = engine.create({
        title: 'Test One-Time Reminder',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: triggerTime },
        enabled: true,
      });

      engine.init();

      expect(triggerSpy).not.toHaveBeenCalled();

      // Advance time to just before trigger
      vi.advanceTimersByTime(4900);
      expect(triggerSpy).not.toHaveBeenCalled();

      // Advance to trigger time
      vi.advanceTimersByTime(200);
      expect(triggerSpy).toHaveBeenCalledWith(reminder.id);

      // Verify the reminder was disabled after firing
      const updated = engine.get(reminder.id);
      expect(updated?.enabled).toBe(false);
    });

    it('triggers interval reminder multiple times', async () => {
      const now = Date.now();
      
      const reminder = engine.create({
        title: 'Test Interval Reminder',
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 1 }, // 1 minute interval
        enabled: true,
      });

      engine.init();

      // Clear any initial calls from init
      triggerSpy.mockClear();

      // First trigger after 1 minute
      vi.advanceTimersByTime(60000);
      // May be called with or without recovery flag depending on watchdog timing
      expect(triggerSpy).toHaveBeenCalled();
      expect(triggerSpy.mock.calls[0][0]).toBe(reminder.id);

      // Reset the call count
      triggerSpy.mockClear();

      // Second trigger after another minute
      // Watchdog runs every 30 seconds, so we advance carefully
      vi.advanceTimersByTime(60000);
      
      // The reminder should have been triggered at least once more
      expect(triggerSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(triggerSpy.mock.calls[0][0]).toBe(reminder.id);

      // Verify the reminder is still enabled
      const updated = engine.get(reminder.id);
      expect(updated?.enabled).toBe(true);
    });

    it('does not trigger when reminder is disabled', async () => {
      const now = Date.now();
      const triggerTime = now + 2000;

      const reminder = engine.create({
        title: 'Disabled Reminder',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: triggerTime },
        enabled: false,
      });

      engine.init();

      vi.advanceTimersByTime(5000);
      expect(triggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Snooze behavior', () => {
    it('reschedules reminder when snoozed', async () => {
      const now = Date.now();
      const triggerTime = now + 1000;

      const reminder = engine.create({
        title: 'Snooze Test',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: triggerTime },
        enabled: true,
      });

      engine.init();

      // Trigger the reminder
      vi.advanceTimersByTime(1500);
      expect(triggerSpy).toHaveBeenCalledWith(reminder.id);
      
      // Snooze for 5 minutes
      engine.snooze(reminder.id, 5);

      // Verify next_run_at was updated
      const snoozed = engine.get(reminder.id);
      expect(snoozed?.next_run_at).toBeGreaterThan(now + 1000);
      expect(snoozed?.next_run_at).toBeLessThanOrEqual(now + 1500 + 5 * 60 * 1000 + 100);
    });
  });

  describe('Startup recovery', () => {
    it('fires overdue reminders on startup', () => {
      const now = Date.now();
      const pastTime = now - 10000; // 10 seconds ago

      const reminder = remindersRepo.create({
        id: 'overdue-1',
        title: 'Overdue Reminder',
        description: null,
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: pastTime },
        timezone: 'local',
        enabled: true,
        next_run_at: pastTime,
        created_at: now - 20000,
        updated_at: now - 20000,
        metadata_json: null,
      });

      engine.init();

      // Startup recovery should have triggered it immediately
      expect(triggerSpy).toHaveBeenCalledWith(reminder.id, true);
    });

    it('schedules future reminders on startup', () => {
      const now = Date.now();
      const futureTime = now + 60000; // 1 minute from now

      const reminder = remindersRepo.create({
        id: 'future-1',
        title: 'Future Reminder',
        description: null,
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: futureTime },
        timezone: 'local',
        enabled: true,
        next_run_at: futureTime,
        created_at: now,
        updated_at: now,
        metadata_json: null,
      });

      engine.init();

      // Should not trigger immediately
      expect(triggerSpy).not.toHaveBeenCalled();

      // Should trigger after the delay
      vi.advanceTimersByTime(60000);
      expect(triggerSpy).toHaveBeenCalledWith(reminder.id);
    });
  });

  describe('Watchdog recovery', () => {
    it('catches missed reminders via watchdog', () => {
      const now = Date.now();
      const triggerTime = now + 5000;

      const reminder = engine.create({
        title: 'Watchdog Test',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: triggerTime },
        enabled: true,
      });

      engine.init();

      // The initial scheduling will trigger it after 5s via setTimeout
      // First, let it trigger normally
      vi.advanceTimersByTime(5100);
      expect(triggerSpy).toHaveBeenCalledWith(reminder.id);
      
      // Now clear and test watchdog recovery
      triggerSpy.mockClear();

      // Manually update the next_run_at to be overdue (simulating a missed trigger)
      const existing = remindersDb.get(reminder.id);
      remindersDb.set(reminder.id, { ...existing, next_run_at: now - 1000, enabled: true });

      // Advance past watchdog interval (30 seconds)
      vi.advanceTimersByTime(31000);

      // Watchdog should have detected and triggered it with recovery flag
      expect(triggerSpy).toHaveBeenCalledWith(reminder.id, true);
    });
  });

  describe('System resume recovery', () => {
    it('recalculates and triggers overdue reminders after resume', () => {
      const now = Date.now();
      const triggerTime = now + 60000; // 1 minute from now

      const reminder = engine.create({
        title: 'Resume Test',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: triggerTime },
        enabled: true,
      });

      engine.init();

      // Simulate system sleep by advancing time without running timers
      const afterSleepTime = triggerTime + 10000; // Wake up 10s after reminder was due
      vi.setSystemTime(afterSleepTime);

      // Simulate system resume
      engine.handleSystemResume();

      // Should have triggered the overdue reminder
      expect(triggerSpy).toHaveBeenCalledWith(reminder.id, true);
    });
  });

  describe('State persistence', () => {
    it('maintains correct next_run_at after recurring reminder fires', () => {
      const now = Date.now();

      const reminder = engine.create({
        title: 'Daily Recurring Test',
        schedule_type: 'daily',
        schedule_data: { time: '09:00' },
        enabled: true,
      });

      const initialNextRun = reminder.next_run_at;

      // Verify the reminder was created with correct schedule_data
      expect(reminder.schedule_data).toEqual({ time: '09:00' });

      engine.init();

      // Verify the schedule_data is properly stored after creation via engine.get()
      const beforeTrigger = engine.get(reminder.id);
      expect(beforeTrigger).toBeDefined();
      expect(beforeTrigger?.schedule_type).toBe('daily');
      expect(beforeTrigger?.schedule_data).toEqual({ time: '09:00' });

      // Fire after the scheduled occurrence; a recurring reminder then advances to
      // its following daily occurrence instead of retaining the current next-run value.
      vi.setSystemTime(initialNextRun + 1);
      engine.triggerReminder(reminder.id);

      // Verify next_run_at was recalculated for a future daily occurrence.
      const updated = engine.get(reminder.id);
      expect(updated?.next_run_at).toBeGreaterThan(initialNextRun);
      expect(updated?.enabled).toBe(true);
      expect(updated?.schedule_data).toEqual({ time: '09:00' });
    });
  });
});
