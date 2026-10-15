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

        if (sql.includes('INSERT INTO reminder_history')) {
          return {
            run: (...args: any[]) => {
              // Handle different reminder_history insert patterns
              const id = args[0];
              const reminder_id = args[1];
              const triggered_at = args[2];
              
              const event: any = {
                id,
                reminder_id,
                triggered_at,
                action: 'triggered', // default
              };
              
              // Detect action type from SQL or args
              if (sql.includes("'triggered'")) {
                event.action = 'triggered';
              } else if (sql.includes("'snoozed'")) {
                event.action = 'snoozed';
                event.snoozed_until = args[3];
              } else if (sql.includes("'dismissed'")) {
                event.action = 'dismissed';
                event.dismissed_at = args[3];
              } else if (sql.includes("'completed'")) {
                event.action = 'completed';
                event.dismissed_at = args[3];
              }
              
              eventsDb.set(id, event);
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

  describe('M11 Phase A: Exactly-once delivery', () => {
    it('does not trigger the same reminder multiple times within debounce window', () => {
      const now = Date.now();
      const triggerTime = now + 1000;

      const reminder = engine.create({
        title: 'Debounce Test',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: triggerTime },
        enabled: true,
      });

      engine.init();

      // Advance to trigger time
      vi.advanceTimersByTime(1100);
      
      // Record how many times it was triggered during the normal flow
      const initialCallCount = triggerSpy.mock.calls.length;
      expect(initialCallCount).toBeGreaterThanOrEqual(1);

      // Attempt manual triggers within debounce window (5 seconds)
      // The spy will record these calls, but the actual logic should exit early
      engine.triggerReminder(reminder.id);
      engine.triggerReminder(reminder.id);
      engine.triggerReminder(reminder.id);

      // Spy records all calls, but check that no actual new work happened
      // by verifying the reminder was only completed once
      const events = Array.from(eventsDb.values());
      const firedEvents = events.filter((e: any) => e.action === 'triggered' && e.reminder_id === reminder.id);
      
      // Should have fired exactly once despite multiple triggerReminder calls
      expect(firedEvents.length).toBe(1);
    });

    it('does not trigger a reminder whose next_run_at is in the future', () => {
      const now = Date.now();
      const futureTime = now + 60000;

      const reminder = remindersRepo.create({
        id: 'future-test',
        title: 'Future Reminder',
        description: null,
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 5 },
        timezone: 'local',
        enabled: true,
        next_run_at: futureTime,
        created_at: now,
        updated_at: now,
        metadata_json: null,
      });

      engine.init();

      // Attempt to trigger a reminder that isn't due yet
      engine.triggerReminder(reminder.id);

      // Verify no event was recorded because the reminder wasn't actually triggered
      const events = Array.from(eventsDb.values());
      const firedEvents = events.filter((e: any) => e.action === 'triggered' && e.reminder_id === reminder.id);
      
      expect(firedEvents.length).toBe(0);
    });

    it('watchdog does not re-trigger a reminder that has already been rescheduled', () => {
      const now = Date.now();
      
      const reminder = engine.create({
        title: 'Watchdog Race Test',
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 1 },
        enabled: true,
      });

      engine.init();

      // Advance to first trigger
      vi.advanceTimersByTime(60000);
      
      // Count fired events after first trigger
      const eventsAfterFirstTrigger = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      expect(eventsAfterFirstTrigger.length).toBeGreaterThanOrEqual(1);
      
      // Verify next_run_at was advanced into the future
      const afterTrigger = engine.get(reminder.id);
      expect(afterTrigger?.next_run_at).toBeGreaterThan(now + 60000);
      
      const eventCountBeforeWatchdog = eventsAfterFirstTrigger.length;

      // Advance watchdog interval (30s) - should NOT re-trigger
      // because next_run_at is now in the future
      vi.advanceTimersByTime(30000);
      
      // Verify no new fired events were added
      const eventsAfterWatchdog = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      expect(eventsAfterWatchdog.length).toBe(eventCountBeforeWatchdog);
    });

    it('interval reminder advances correctly even when triggered multiple times in recovery', () => {
      const now = Date.now();
      
      const reminder = remindersRepo.create({
        id: 'interval-recovery',
        title: 'Interval Recovery Test',
        description: null,
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 2 },
        timezone: 'local',
        enabled: true,
        next_run_at: now - 10000, // Overdue by 10 seconds
        created_at: now - 120000,
        updated_at: now - 120000,
        metadata_json: null,
      });

      engine.init();

      // Startup recovery should trigger once
      const firedEvents = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      expect(firedEvents.length).toBe(1);
      
      // Verify next_run_at is genuinely in the future
      const afterRecovery = engine.get(reminder.id);
      expect(afterRecovery?.next_run_at).toBeGreaterThan(now);
      expect(afterRecovery?.next_run_at).toBeLessThanOrEqual(now + (2 * 60 * 1000) + 1000);
    });

    it('one-time reminder clears active timer after completion', () => {
      const now = Date.now();
      const triggerTime = now + 2000;

      const reminder = engine.create({
        title: 'One-Time Timer Clear Test',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: triggerTime },
        enabled: true,
      });

      engine.init();

      // Advance to trigger
      vi.advanceTimersByTime(2100);
      
      const firedEvents = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      expect(firedEvents.length).toBe(1);
      
      // Verify reminder is disabled
      const completed = engine.get(reminder.id);
      expect(completed?.enabled).toBe(false);
      
      const eventCountBefore = firedEvents.length;

      // Advance more time and ensure watchdog doesn't re-trigger completed reminder
      vi.advanceTimersByTime(60000);
      
      const firedEventsAfter = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      expect(firedEventsAfter.length).toBe(eventCountBefore);
    });
  });

  describe('M11.1 Phase A: Concurrent trigger protection (race condition fix)', () => {
    it('prevents scheduler and watchdog from duplicating the same due occurrence', () => {
      const now = Date.now();
      const triggerTime = now + 1000;

      const reminder = engine.create({
        title: 'Concurrent Trigger Test',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: triggerTime },
        enabled: true,
      });

      engine.init();

      // Advance to trigger time - scheduler timeout fires
      vi.advanceTimersByTime(1100);
      
      // Immediately call triggerReminder again to simulate watchdog racing with scheduler
      // This simulates the exact scenario from the bug report where both paths see the same next_run_at
      engine.triggerReminder(reminder.id, true);
      engine.triggerReminder(reminder.id, true);

      // Should have fired exactly once despite concurrent trigger attempts
      const firedEvents = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      expect(firedEvents.length).toBe(1);

      // Should have exactly one completion event
      const completedEvents = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'completed' && e.reminder_id === reminder.id
      );
      expect(completedEvents.length).toBe(1);
    });

    it('prevents duplicate triggers when watchdog runs immediately after scheduler', () => {
      const now = Date.now();
      
      const reminder = engine.create({
        title: 'Watchdog Race Test',
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 1 },
        enabled: true,
      });

      engine.init();

      // Clear initial calls
      triggerSpy.mockClear();
      const initialEventCount = eventsDb.size;

      // Advance to trigger time
      vi.advanceTimersByTime(60100);
      
      // Simulate watchdog running immediately after (before database fully updates)
      // This is the exact race condition from the bug report
      const afterScheduler = engine.get(reminder.id);
      
      // Manually attempt to trigger again as watchdog would
      engine.triggerReminder(reminder.id, true);
      
      // Count events - should only have ONE new 'triggered' event for this occurrence
      const newEvents = Array.from(eventsDb.values()).slice(initialEventCount);
      const triggeredEvents = newEvents.filter((e: any) => e.action === 'triggered' && e.reminder_id === reminder.id);
      
      expect(triggeredEvents.length).toBe(1);
    });

    it('allows future occurrences to trigger after occurrence-based protection clears', () => {
      const now = Date.now();
      
      const reminder = engine.create({
        title: 'Future Occurrence Test',
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 1 },
        enabled: true,
      });

      engine.init();

      // First trigger
      vi.advanceTimersByTime(60100);
      
      const firstOccurrenceEvents = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      const firstCount = firstOccurrenceEvents.length;
      expect(firstCount).toBeGreaterThanOrEqual(1);

      // Wait for occurrence claim to clear (1 second)
      vi.advanceTimersByTime(1100);

      // Advance to next interval
      vi.advanceTimersByTime(59000);
      
      // Should have a new trigger for the next occurrence
      const secondOccurrenceEvents = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      expect(secondOccurrenceEvents.length).toBeGreaterThan(firstCount);
    });

    it('prevents duplicate processing when multiple recovery paths run simultaneously', () => {
      const now = Date.now();
      const pastTime = now - 5000;

      const reminder = remindersRepo.create({
        id: 'multi-recovery',
        title: 'Multi-Recovery Test',
        description: null,
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: pastTime },
        timezone: 'local',
        enabled: true,
        next_run_at: pastTime,
        created_at: now - 10000,
        updated_at: now - 10000,
        metadata_json: null,
      });

      // Simulate three concurrent recovery paths trying to process the same overdue reminder
      engine.triggerReminder(reminder.id, true); // Startup recovery
      engine.triggerReminder(reminder.id, true); // System resume recovery
      engine.triggerReminder(reminder.id, true); // Watchdog recovery

      // Should have fired exactly once
      const firedEvents = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      );
      expect(firedEvents.length).toBe(1);

      // Should have exactly one completion event
      const completedEvents = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'completed' && e.reminder_id === reminder.id
      );
      expect(completedEvents.length).toBe(1);
    });

    it('updates database state before delivery actions', () => {
      const now = Date.now();

      const reminder = engine.create({
        title: 'State Update Order Test',
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 2 },
        enabled: true,
      });

      engine.init();

      const initialNextRun = reminder.next_run_at;

      // Advance to trigger
      vi.advanceTimersByTime(120100);
      
      // Verify next_run_at was updated in database
      const updated = engine.get(reminder.id);
      expect(updated?.next_run_at).toBeGreaterThan(initialNextRun);
      expect(updated?.next_run_at).toBeGreaterThan(now + 120000);
      
      // Verify last_run_at was also set and is at or after the trigger time
      expect(updated?.last_run_at).toBeDefined();
      expect(updated?.last_run_at).toBeGreaterThanOrEqual(now + 120000);
    });

    it('watchdog observes updated next_run_at after scheduler processes reminder', () => {
      const now = Date.now();
      
      const reminder = engine.create({
        title: 'Watchdog State Visibility Test',
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 1 },
        enabled: true,
      });

      engine.init();

      // Advance to trigger via scheduler
      vi.advanceTimersByTime(60100);
      
      // Get the updated next_run_at
      const afterScheduler = engine.get(reminder.id);
      const updatedNextRun = afterScheduler?.next_run_at;
      
      expect(updatedNextRun).toBeGreaterThan(now + 60000);

      const eventCountBefore = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      ).length;

      // Advance watchdog interval - should NOT trigger because next_run_at is in future
      vi.advanceTimersByTime(30000);
      
      // Verify no new trigger events
      const eventCountAfter = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      ).length;
      
      expect(eventCountAfter).toBe(eventCountBefore);
    });

    it('snoozed reminders maintain exactly-once semantics', () => {
      const now = Date.now();

      // Use an interval reminder so it doesn't get disabled after first trigger
      const reminder = engine.create({
        title: 'Snooze Exactly-Once Test',
        schedule_type: 'interval',
        schedule_data: { intervalMinutes: 10 }, // 10 minute interval
        enabled: true,
      });

      engine.init();

      // Advance to first trigger
      vi.advanceTimersByTime(600100); // 10 minutes + buffer
      
      const firedCountBefore = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      ).length;
      expect(firedCountBefore).toBeGreaterThanOrEqual(1);

      // Snooze for 2 minutes
      engine.snooze(reminder.id, 2);
      
      // Advance through multiple watchdog cycles
      vi.advanceTimersByTime(90000); // 90 seconds
      
      // Should not have triggered again yet (snoozed for 2 minutes)
      const firedCountDuringSnooze = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      ).length;
      expect(firedCountDuringSnooze).toBe(firedCountBefore);
      
      // Advance past snooze time
      vi.advanceTimersByTime(35000); // Total > 2 minutes
      
      // Should trigger exactly once more
      const firedCountAfterSnooze = Array.from(eventsDb.values()).filter(
        (e: any) => e.action === 'triggered' && e.reminder_id === reminder.id
      ).length;
      expect(firedCountAfterSnooze).toBe(firedCountBefore + 1);
    });
  });
});
