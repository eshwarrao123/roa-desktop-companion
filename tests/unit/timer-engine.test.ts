import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { TimersRepository } from '../../src/main/services/timer-engine/timers.repository';
import { TimerEngine } from '../../src/main/services/timer-engine';
import { SettingsStore } from '../../src/main/services/settings-store';
import { WindowManager } from '../../src/main/window-manager';
import { Timer } from '../../src/shared/types/timers';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/mock/path',
  },
  powerMonitor: {
    on: vi.fn(),
    isOnBatteryPower: () => false,
    getSystemIdleTime: () => 0,
  },
  Notification: class {
    static isSupported() {
      return false;
    }
    show() {}
    on() {}
  },
}));

describe('TimerEngine & TimersRepository', () => {
  let timersDb: Map<string, any>;
  let settingsDb: Map<string, any>;
  let mockDb: Database.Database;
  let repo: TimersRepository;
  let settingsStore: SettingsStore;
  let windowManager: WindowManager;
  let engine: TimerEngine;

  beforeEach(() => {
    timersDb = new Map();
    settingsDb = new Map();

    mockDb = {
      prepare: (sql: string) => {
        if (sql.includes('INSERT INTO timers')) {
          return {
            run: (...args: any[]) => {
              const [
                id,
                label,
                type,
                duration_ms,
                started_at,
                ends_at,
                remaining_ms,
                state,
                pomodoro_phase,
                pomodoro_cycle,
                created_at,
                updated_at,
              ] = args;
              timersDb.set(id, {
                id,
                label,
                type,
                duration_ms,
                started_at,
                ends_at,
                remaining_ms,
                state,
                pomodoro_phase,
                pomodoro_cycle,
                created_at,
                updated_at,
              });
              return { changes: 1 };
            },
          };
        }

        if (sql.includes('SELECT * FROM timers WHERE id = ?')) {
          return {
            get: (id: string) => timersDb.get(id),
          };
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

        if (sql.includes('SELECT * FROM timers ORDER BY created_at DESC')) {
          return {
            all: () => Array.from(timersDb.values()),
          };
        }

        if (sql.includes('UPDATE timers SET')) {
          return {
            run: (...values: any[]) => {
              const id = values[values.length - 1];
              const timer = timersDb.get(id);
              if (timer) {
                // Approximate mock update
                if (sql.includes('state = ?')) {
                  const stateIdx = sql.split('state = ?')[0].split('?').length - 1;
                  timer.state = values[stateIdx];
                }
                if (sql.includes('remaining_ms = ?')) {
                  const remIdx = sql.split('remaining_ms = ?')[0].split('?').length - 1;
                  timer.remaining_ms = values[remIdx];
                }
                if (sql.includes('ends_at = ?')) {
                  const endsIdx = sql.split('ends_at = ?')[0].split('?').length - 1;
                  timer.ends_at = values[endsIdx];
                }
                timer.updated_at = Date.now();
              }
              return { changes: timer ? 1 : 0 };
            },
          };
        }

        if (sql.includes('DELETE FROM timers WHERE id = ?')) {
          return {
            run: (id: string) => {
              const deleted = timersDb.delete(id);
              return { changes: deleted ? 1 : 0 };
            },
          };
        }

        // Settings queries
        if (sql.includes('SELECT key, value_json FROM settings')) {
          return {
            all: () => Array.from(settingsDb.values()),
          };
        }
        if (sql.includes('INSERT INTO settings')) {
          return {
            run: (key: string, value_json: string, updated_at: number) => {
              settingsDb.set(key, { key, value_json, updated_at });
              return { changes: 1 };
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

    repo = new TimersRepository(mockDb);
    settingsStore = new SettingsStore(mockDb);
    windowManager = {
      getDashboardWindow: () => null,
      getPetWindow: () => null,
    } as unknown as WindowManager;

    engine = new TimerEngine(repo, windowManager, settingsStore);
  });

  it('creates and retrieves a countdown timer', () => {
    const timer = engine.createTimer({
      label: 'Focus Sprint',
      duration_ms: 25 * 60 * 1000,
      type: 'countdown',
    });

    expect(timer.id).toBeDefined();
    expect(timer.label).toBe('Focus Sprint');
    expect(timer.state).toBe('idle');
    expect(timer.duration_ms).toBe(1500000);
    expect(timer.remaining_ms).toBe(1500000);

    const retrieved = engine.getTimer(timer.id);
    expect(retrieved?.id).toBe(timer.id);
  });

  it('starts and pauses a timer preserving remaining time', () => {
    const timer = engine.createTimer({
      label: 'Study',
      duration_ms: 60000,
      type: 'countdown',
    });

    const started = engine.startTimer(timer.id);
    expect(started.state).toBe('running');
    expect(started.ends_at).toBeGreaterThan(Date.now());

    const paused = engine.pauseTimer(timer.id);
    expect(paused.state).toBe('paused');
    expect(paused.ends_at).toBeNull();
    expect(paused.remaining_ms).toBeLessThanOrEqual(60000);
  });

  it('resets a timer back to initial duration and idle state', () => {
    const timer = engine.createTimer({
      label: 'Tea',
      duration_ms: 180000,
      type: 'countdown',
    });

    engine.startTimer(timer.id);
    const reset = engine.resetTimer(timer.id);

    expect(reset.state).toBe('idle');
    expect(reset.remaining_ms).toBe(180000);
    expect(reset.ends_at).toBeNull();
  });

  it('cancels a timer correctly', () => {
    const timer = engine.createTimer({
      label: 'Short',
      duration_ms: 30000,
      type: 'countdown',
    });

    engine.startTimer(timer.id);
    engine.cancelTimer(timer.id);

    const cancelled = engine.getTimer(timer.id);
    expect(cancelled?.state).toBe('cancelled');
  });

  it('manages Pomodoro phases and cycle transitions', () => {
    const pomState = engine.getPomodoroState();
    expect(pomState.phase).toBe('focus');
    expect(pomState.completedCycles).toBe(0);
    expect(pomState.focusDurationMinutes).toBe(25);
    expect(pomState.shortBreakMinutes).toBe(5);

    // Start focus
    const started = engine.startPomodoro('focus');
    expect(started.activeTimer?.state).toBe('running');
    expect(started.activeTimer?.pomodoro_phase).toBe('focus');

    // Skip to next phase -> should transition to short_break (cycle 1)
    const skipped = engine.skipPomodoro();
    expect(skipped.phase).toBe('short_break');
    expect(skipped.completedCycles).toBe(1);
    expect(skipped.activeTimer?.label).toBe('Short Break');

    // Skip break -> should transition to focus
    const backToFocus = engine.skipPomodoro();
    expect(backToFocus.phase).toBe('focus');
  });

  it('advances to long_break on the 4th completed focus session', () => {
    engine.startPomodoro('focus');
    engine.skipPomodoro(); // Cycle 1 -> short_break
    engine.skipPomodoro(); // -> focus
    engine.skipPomodoro(); // Cycle 2 -> short_break
    engine.skipPomodoro(); // -> focus
    engine.skipPomodoro(); // Cycle 3 -> short_break
    engine.skipPomodoro(); // -> focus
    const fourthBreak = engine.skipPomodoro(); // Cycle 4 -> long_break!

    expect(fourthBreak.phase).toBe('long_break');
    expect(fourthBreak.completedCycles).toBe(4);
    expect(fourthBreak.activeTimer?.label).toBe('Long Break');
  });
});
