import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { TimersRepository } from '../../src/main/services/timer-engine/timers.repository';
import { TimerEngine } from '../../src/main/services/timer-engine';
import { SettingsStore } from '../../src/main/services/settings-store';
import { WindowManager } from '../../src/main/window-manager';

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
    on() {}
  },
}));

/**
 * M10 Phase C: Timer Engine Reliability Integration Tests
 * 
 * These tests verify actual timer behavior over time, including:
 * - Real-time countdown behavior
 * - Pause/resume state persistence
 * - Navigation survivability
 * - Application restart recovery
 * - Pomodoro phase transitions
 */
describe('TimerEngine Reliability (M10 Phase C)', () => {
  let timersDb: Map<string, any>;
  let settingsDb: Map<string, any>;
  let mockDb: Database.Database;
  let repo: TimersRepository;
  let settingsStore: SettingsStore;
  let windowManager: WindowManager;
  let engine: TimerEngine;
  let completeSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    timersDb = new Map();
    settingsDb = new Map();

    mockDb = {
      prepare: (sql: string) => {
        if (sql.includes('INSERT INTO timers')) {
          return {
            run: (...args: any[]) => {
              const [id, label, type, duration_ms, started_at, ends_at, remaining_ms, state, pomodoro_phase, pomodoro_cycle, created_at, updated_at] = args;
              timersDb.set(id, { id, label, type, duration_ms, started_at, ends_at, remaining_ms, state, pomodoro_phase, pomodoro_cycle, created_at, updated_at });
              return { changes: 1 };
            },
          };
        }

        if (sql.includes('SELECT * FROM timers WHERE id = ?')) {
          return { get: (id: string) => timersDb.get(id) };
        }

        if (sql.includes("SELECT * FROM timers WHERE state IN ('running', 'paused')")) {
          return {
            get: (...args: any[]) => {
              const type = args[0];
              const items = Array.from(timersDb.values()).filter(
                (t) => (t.state === 'running' || t.state === 'paused') && (!type || t.type === type)
              );
              return items[0] ?? undefined;
            },
          };
        }

        if (sql.includes("SELECT * FROM timers WHERE state = 'running'")) {
          return {
            all: () => Array.from(timersDb.values()).filter((t) => t.state === 'running'),
          };
        }

        if (sql.includes('UPDATE timers SET')) {
          return {
            run: (...args: any[]) => {
              const id = args[args.length - 1];
              const existing = timersDb.get(id);
              if (!existing) return { changes: 0 };

              const updates: any = { updated_at: Number(args[args.length - 2]) };
              const fields = sql.match(/UPDATE timers SET\s+([\s\S]*?)\s+WHERE id = \?/)?.[1];

              if (fields) {
                const fieldList = fields.split(',').map((field) => field.trim().split(' = ?')[0]);
                fieldList.forEach((field, idx) => {
                  if (field !== 'updated_at' && idx < args.length - 2) {
                    const value = args[idx];
                    if (field === 'remaining_ms' || field === 'duration_ms') {
                      updates[field] = Number(value);
                    } else if (field === 'started_at' || field === 'ends_at') {
                      updates[field] = value !== null && value !== undefined ? Number(value) : null;
                    } else {
                      updates[field] = value;
                    }
                  }
                });
              }

              timersDb.set(id, { ...existing, ...updates });
              return { changes: 1 };
            },
          };
        }

        if (sql.includes('SELECT key, value_json FROM settings')) {
          return {
            all: () => Array.from(settingsDb.values()),
          };
        }

        if (sql.includes('INSERT INTO settings')) {
          return {
            run: (key: string, value_json: string) => {
              settingsDb.set(key, { key, value_json, updated_at: Date.now() });
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

    repo = new TimersRepository(mockDb);
    settingsStore = new SettingsStore(mockDb);
    windowManager = {
      getDashboardWindow: () => null,
      getPetWindow: () => null,
      showDashboard: vi.fn(),
    } as unknown as WindowManager;

    engine = new TimerEngine(repo, windowManager, settingsStore);
  });

  afterEach(() => {
    vi.useRealTimers();
    engine.shutdown();
  });

  describe('Countdown timer lifecycle', () => {
    it('completes a timer after the full duration', () => {
      const timer = engine.createTimer({
        label: 'Test Timer',
        type: 'countdown',
        duration_ms: 60000, // 1 minute
      });

      engine.init();
      engine.startTimer(timer.id);

      const running = engine.getTimer(timer.id);
      expect(running?.state).toBe('running');
      expect(running?.ends_at).toBeGreaterThan(Date.now());

      // Advance time to just before completion
      vi.advanceTimersByTime(59000);
      const almostDone = engine.getTimer(timer.id);
      expect(almostDone?.state).toBe('running');

      // Advance to completion
      vi.advanceTimersByTime(1100);
      const completed = engine.getTimer(timer.id);
      expect(completed?.state).toBe('completed');
      expect(completed?.remaining_ms).toBe(0);
    });

    it('preserves remaining time correctly when paused', () => {
      const timer = engine.createTimer({
        label: 'Pause Test',
        type: 'countdown',
        duration_ms: 60000,
      });

      engine.init();
      engine.startTimer(timer.id);

      // Run for 20 seconds
      vi.advanceTimersByTime(20000);

      // Pause
      const paused = engine.pauseTimer(timer.id);
      expect(paused.state).toBe('paused');
      expect(paused.remaining_ms).toBeGreaterThan(39000);
      expect(paused.remaining_ms).toBeLessThanOrEqual(40000);
      expect(paused.ends_at).toBeNull();

      // Advance time while paused (should not affect remaining time)
      vi.advanceTimersByTime(30000);
      const stillPaused = engine.getTimer(timer.id);
      expect(stillPaused?.remaining_ms).toEqual(paused.remaining_ms);
    });

    it('resumes from paused state correctly', () => {
      const timer = engine.createTimer({
        label: 'Resume Test',
        type: 'countdown',
        duration_ms: 60000,
      });

      engine.init();
      engine.startTimer(timer.id);

      vi.advanceTimersByTime(20000);
      const paused = engine.pauseTimer(timer.id);
      const remainingAfterPause = paused.remaining_ms;

      vi.advanceTimersByTime(10000); // Time passes while paused

      // Resume
      const resumed = engine.resumeTimer(timer.id);
      expect(resumed.state).toBe('running');
      expect(resumed.remaining_ms).toEqual(remainingAfterPause);
      expect(resumed.ends_at).toBeGreaterThan(Date.now());

      // Should complete after remaining time
      vi.advanceTimersByTime(remainingAfterPause + 100);
      const completed = engine.getTimer(timer.id);
      expect(completed?.state).toBe('completed');
    });

    it('resets timer to initial state', () => {
      const timer = engine.createTimer({
        label: 'Reset Test',
        type: 'countdown',
        duration_ms: 60000,
      });

      engine.init();
      engine.startTimer(timer.id);
      vi.advanceTimersByTime(30000);

      const reset = engine.resetTimer(timer.id);
      expect(reset.state).toBe('idle');
      expect(reset.remaining_ms).toBe(60000);
      expect(reset.started_at).toBeNull();
      expect(reset.ends_at).toBeNull();
    });

    it('cancels a running timer', () => {
      const timer = engine.createTimer({
        label: 'Cancel Test',
        type: 'countdown',
        duration_ms: 60000,
      });

      engine.init();
      engine.startTimer(timer.id);
      vi.advanceTimersByTime(20000);

      engine.cancelTimer(timer.id);
      const cancelled = engine.getTimer(timer.id);
      expect(cancelled?.state).toBe('cancelled');
      expect(cancelled?.ends_at).toBeNull();

      // Should not complete
      vi.advanceTimersByTime(50000);
      const stillCancelled = engine.getTimer(timer.id);
      expect(stillCancelled?.state).toBe('cancelled');
    });
  });

  describe('Pomodoro flow', () => {
    it('transitions from focus to short break correctly', () => {
      engine.init();
      
      const focusState = engine.startPomodoro('focus');
      expect(focusState.activeTimer?.pomodoro_phase).toBe('focus');
      expect(focusState.activeTimer?.state).toBe('running');

      // Complete focus session (default 25 minutes)
      vi.advanceTimersByTime(25 * 60 * 1000 + 100);

      const afterFocus = engine.getPomodoroState();
      expect(afterFocus.phase).toBe('short_break');
      expect(afterFocus.completedCycles).toBe(1);
    });

    it('transitions to long break after configured cycles', () => {
      settingsStore.set('pomodoro.longBreakInterval', 4);
      engine.init();

      // Complete 3 focus sessions with short breaks
      for (let i = 0; i < 3; i++) {
        engine.startPomodoro('focus');
        vi.advanceTimersByTime(25 * 60 * 1000 + 100);

        const state = engine.getPomodoroState();
        expect(state.phase).toBe('short_break');
      }

      // Fourth focus session should lead to long break
      engine.startPomodoro('focus');
      vi.advanceTimersByTime(25 * 60 * 1000 + 100);

      const finalState = engine.getPomodoroState();
      expect(finalState.phase).toBe('long_break');
      expect(finalState.completedCycles).toBe(4);
    });

    it('pauses and resumes pomodoro session', () => {
      engine.init();
      engine.startPomodoro('focus');

      vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes in

      const pausedState = engine.pausePomodoro();
      expect(pausedState.activeTimer?.state).toBe('paused');

      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes pass while paused

      const resumedState = engine.resumePomodoro();
      expect(resumedState.activeTimer?.state).toBe('running');

      // Should complete after remaining time (15 minutes)
      vi.advanceTimersByTime(15 * 60 * 1000 + 100);
      const completed = engine.getPomodoroState();
      expect(completed.phase).toBe('short_break');
    });

    it('skips to next phase correctly', () => {
      engine.init();
      engine.startPomodoro('focus');

      vi.advanceTimersByTime(5 * 60 * 1000); // Only 5 minutes in

      const skipped = engine.skipPomodoro();
      expect(skipped.phase).toBe('short_break');
      expect(skipped.activeTimer?.pomodoro_phase).toBe('short_break');
      expect(skipped.completedCycles).toBe(1);
    });
  });

  describe('Startup recovery', () => {
    it('completes timers that elapsed while app was closed', () => {
      const now = Date.now();
      const pastEndsAt = now - 5000; // Should have completed 5 seconds ago

      repo.create({
        id: 'elapsed-timer',
        label: 'Elapsed Timer',
        type: 'countdown',
        duration_ms: 60000,
        started_at: pastEndsAt - 60000,
        ends_at: pastEndsAt,
        remaining_ms: 0,
        state: 'running',
        created_at: now - 70000,
        updated_at: now - 60000,
      });

      engine.init();

      // Should have been completed during startup recovery
      const timer = engine.getTimer('elapsed-timer');
      expect(timer?.state).toBe('completed');
    });

    it('reschedules timers that are still running', () => {
      const now = Date.now();
      const futureEndsAt = now + 30000; // 30 seconds remaining

      repo.create({
        id: 'ongoing-timer',
        label: 'Ongoing Timer',
        type: 'countdown',
        duration_ms: 60000,
        started_at: now - 30000,
        ends_at: futureEndsAt,
        remaining_ms: 30000,
        state: 'running',
        created_at: now - 30000,
        updated_at: now - 30000,
      });

      engine.init();

      // Should still be running
      const timer = engine.getTimer('ongoing-timer');
      expect(timer?.state).toBe('running');

      // Should complete after remaining time
      vi.advanceTimersByTime(30100);
      const completed = engine.getTimer('ongoing-timer');
      expect(completed?.state).toBe('completed');
    });
  });

  describe('System resume recovery', () => {
    it('handles timer that elapsed during sleep', () => {
      const now = Date.now();
      const futureEndsAt = now + 60000; // 1 minute from now

      const timer = repo.create({
        id: 'sleep-timer',
        label: 'Sleep Timer',
        type: 'countdown',
        duration_ms: 120000,
        started_at: now,
        ends_at: futureEndsAt,
        remaining_ms: 60000,
        state: 'running',
        created_at: now,
        updated_at: now,
      });

      engine.init();

      // Simulate system sleep by advancing system time without timers
      const afterSleepTime = futureEndsAt + 30000; // 30 seconds after it should have completed
      vi.setSystemTime(afterSleepTime);

      // Trigger system resume
      engine.handleSystemResume();

      // Should have been completed
      const resumed = engine.getTimer('sleep-timer');
      expect(resumed?.state).toBe('completed');
    });
  });

  describe('Watchdog protection', () => {
    it('catches overdue timers via watchdog', () => {
      const now = Date.now();

      const timer = engine.createTimer({
        label: 'Watchdog Test',
        type: 'countdown',
        duration_ms: 10000,
      });

      engine.init();
      engine.startTimer(timer.id);

      // Manually corrupt the ends_at to be in the past (simulating missed timeout)
      const corrupted = repo.get(timer.id);
      repo['db'].prepare('UPDATE timers SET ends_at = ? WHERE id = ?').run(now - 5000, timer.id);

      // Advance past watchdog interval (15 seconds)
      vi.advanceTimersByTime(16000);

      // Watchdog should have caught and completed it
      const fixed = engine.getTimer(timer.id);
      expect(fixed?.state).toBe('completed');
    });
  });

  describe('Timer state persistence', () => {
    it('maintains accurate remaining_ms during pause/resume cycles', () => {
      const timer = engine.createTimer({
        label: 'Multi-Pause Test',
        type: 'countdown',
        duration_ms: 60000,
      });

      engine.init();
      engine.startTimer(timer.id);

      // Run 10s, pause
      vi.advanceTimersByTime(10000);
      const pause1 = engine.pauseTimer(timer.id);
      const remaining1 = pause1.remaining_ms;

      // Resume and run 10s more
      vi.advanceTimersByTime(5000); // Time passes while paused
      engine.resumeTimer(timer.id);
      vi.advanceTimersByTime(10000);

      // Pause again
      const pause2 = engine.pauseTimer(timer.id);
      expect(pause2.remaining_ms).toBeLessThan(remaining1);
      expect(pause2.remaining_ms).toBeGreaterThan(30000);
      expect(pause2.remaining_ms).toBeLessThanOrEqual(40000);
    });
  });
});
