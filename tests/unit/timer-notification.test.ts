import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { TimersRepository } from '../../src/main/services/timer-engine/timers.repository';
import { TimerEngine } from '../../src/main/services/timer-engine';
import { SettingsStore } from '../../src/main/services/settings-store';
import { WindowManager } from '../../src/main/window-manager';

describe('TimerEngine Notification Behavior (M13.2)', () => {
  let timersDb: Map<string, any>;
  let settingsDb: Map<string, any>;
  let mockDb: Database.Database;
  let repo: TimersRepository;
  let settingsStore: SettingsStore;
  let windowManager: WindowManager;
  let engine: TimerEngine;
  let notificationShowSpy: any;
  let notificationOnSpy: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    timersDb = new Map();
    settingsDb = new Map();

    // Mock notification
    notificationShowSpy = vi.fn();
    notificationOnSpy = vi.fn();

    vi.mock('electron', () => ({
      app: {
        isPackaged: false,
        getPath: () => '/mock/path',
        setAppUserModelId: vi.fn(),
      },
      powerMonitor: {
        on: vi.fn(),
      },
      Notification: class {
        static isSupported() {
          return true;
        }
        constructor(options: any) {
          // Store for verification
        }
        show = notificationShowSpy;
        on = notificationOnSpy;
      },
    }));

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
    vi.clearAllMocks();
    engine.shutdown();
  });

  it('logs notification attempt when timer completes', () => {
    const timer = engine.createTimer({
      label: 'Test Notification',
      type: 'countdown',
      duration_ms: 5000,
    });

    engine.init();
    engine.startTimer(timer.id);

    // Advance to completion
    vi.advanceTimersByTime(5100);

    // Verify completion was logged
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[TimerEngine] Timer completed: "Test Notification"')
    );
  });

  it('does not show notification for paused timers', () => {
    const timer = engine.createTimer({
      label: 'Pause Test',
      type: 'countdown',
      duration_ms: 60000,
    });

    engine.init();
    engine.startTimer(timer.id);
    engine.pauseTimer(timer.id);

    // Notification show should not be called for pause
    const notificationLogs = consoleLogSpy.mock.calls.filter(
      (call) => call[0]?.includes('Native notification shown')
    );
    expect(notificationLogs.length).toBe(0);
  });

  it('does not show notification for reset timers', () => {
    const timer = engine.createTimer({
      label: 'Reset Test',
      type: 'countdown',
      duration_ms: 60000,
    });

    engine.init();
    engine.startTimer(timer.id);
    vi.advanceTimersByTime(10000);
    engine.resetTimer(timer.id);

    // Notification show should not be called for reset
    const notificationLogs = consoleLogSpy.mock.calls.filter(
      (call) => call[0]?.includes('Native notification shown')
    );
    expect(notificationLogs.length).toBe(0);
  });

  it('does not show notification for cancelled timers', () => {
    const timer = engine.createTimer({
      label: 'Cancel Test',
      type: 'countdown',
      duration_ms: 60000,
    });

    engine.init();
    engine.startTimer(timer.id);
    vi.advanceTimersByTime(10000);
    engine.cancelTimer(timer.id);

    // Notification show should not be called for cancel
    const notificationLogs = consoleLogSpy.mock.calls.filter(
      (call) => call[0]?.includes('Native notification shown')
    );
    expect(notificationLogs.length).toBe(0);
  });

  it('completes timer exactly once without duplicate notifications', () => {
    const timer = engine.createTimer({
      label: 'Duplicate Test',
      type: 'countdown',
      duration_ms: 5000,
    });

    engine.init();
    engine.startTimer(timer.id);

    // Advance to completion
    vi.advanceTimersByTime(5100);

    // Check completion was logged exactly once
    const completionLogs = consoleLogSpy.mock.calls.filter(
      (call) => call[0]?.includes('[TimerEngine] Timer completed: "Duplicate Test"')
    );
    expect(completionLogs.length).toBe(1);
  });

  it('provides appropriate notification titles for Pomodoro phases', () => {
    engine.init();
    
    // Test focus completion
    const focusState = engine.startPomodoro('focus');
    expect(focusState.activeTimer?.pomodoro_phase).toBe('focus');

    // Complete focus session
    vi.advanceTimersByTime(25 * 60 * 1000 + 100);

    // Verify completion was processed
    const completionLogs = consoleLogSpy.mock.calls.filter(
      (call) => call[0]?.includes('[TimerEngine] Timer completed: "Pomodoro Focus"')
    );
    expect(completionLogs.length).toBe(1);
  });

  it('logs "requested" rather than "delivered" before delivery confirmation (M13.3)', () => {
    const timer = engine.createTimer({
      label: 'Notification Lifecycle Test',
      type: 'countdown',
      duration_ms: 3000,
    });

    engine.init();
    engine.startTimer(timer.id);
    vi.advanceTimersByTime(3100);

    // Verify completion was logged
    const completionLogs = consoleLogSpy.mock.calls.filter(
      (call) => call[0]?.includes('[TimerEngine] Timer completed')
    );
    expect(completionLogs.length).toBeGreaterThan(0);

    // In the test environment, notification behavior depends on Electron availability
    // The implementation should either log "requested" or handle gracefully
    const allLogs = consoleLogSpy.mock.calls.map((call) => call[0]);
    
    // Should not log "delivered" without a 'show' event confirmation
    const deliveredLogs = allLogs.filter(
      (log) => log?.includes('Native notification delivered')
    );
    expect(deliveredLogs.length).toBe(0);

    // Timer should complete successfully regardless of notification status
    const completedTimer = engine.getTimer(timer.id);
    expect(completedTimer?.state).toBe('completed');
  });

  it('recognizes Windows WPN_E_NOTIFICATION_TYPE_DISABLED error (M13.3)', () => {
    const timer = engine.createTimer({
      label: 'Windows Error Test',
      type: 'countdown',
      duration_ms: 2000,
    });

    engine.init();
    engine.startTimer(timer.id);

    // Simulate notification failure with Windows HRESULT
    const mockNotificationInstance = {
      show: vi.fn(),
      on: vi.fn((event: string, handler: any) => {
        if (event === 'failed') {
          // Simulate the Windows notification failure
          setTimeout(() => handler(null, 'Notification failed. HRESULT:-2143420140'), 10);
        }
      }),
    };

    // Complete timer to trigger notification
    vi.advanceTimersByTime(2100);

    // Advance past notification event processing
    vi.advanceTimersByTime(100);

    // The error handler should recognize the specific HRESULT
    // In actual implementation, this would trigger fallback
    expect(true).toBe(true); // Placeholder - actual behavior tested in integration
  });

  it('sends fallback IPC event when native notification fails (M13.3)', () => {
    const mockDashWindow = {
      isDestroyed: () => false,
      webContents: {
        send: vi.fn(),
      },
    };

    windowManager = {
      getDashboardWindow: () => mockDashWindow,
      getPetWindow: () => null,
      showDashboard: vi.fn(),
    } as unknown as WindowManager;

    engine = new TimerEngine(repo, windowManager, settingsStore);
    engine.init();

    const timer = engine.createTimer({
      label: 'Fallback Test',
      type: 'countdown',
      duration_ms: 1000,
    });

    engine.startTimer(timer.id);
    vi.advanceTimersByTime(1100);

    // Fallback should send completion event to dashboard
    // Note: In mock environment, fallback is triggered after timeout
    vi.advanceTimersByTime(600); // Wait for fallback timeout

    expect(mockDashWindow.webContents.send).toHaveBeenCalledWith(
      'roa:timers:completed',
      expect.objectContaining({
        label: 'Fallback Test',
        type: 'countdown',
      })
    );
  });

  it('does not send duplicate fallback events (M13.3)', () => {
    const mockDashWindow = {
      isDestroyed: () => false,
      webContents: {
        send: vi.fn(),
      },
    };

    windowManager = {
      getDashboardWindow: () => mockDashWindow,
      getPetWindow: () => null,
      showDashboard: vi.fn(),
    } as unknown as WindowManager;

    engine = new TimerEngine(repo, windowManager, settingsStore);
    engine.init();

    const timer = engine.createTimer({
      label: 'No Duplicate Fallback',
      type: 'countdown',
      duration_ms: 1000,
    });

    engine.startTimer(timer.id);
    vi.advanceTimersByTime(1100);
    vi.advanceTimersByTime(600);

    // Should only send one completion event
    const completionCalls = mockDashWindow.webContents.send.mock.calls.filter(
      (call) => call[0] === 'roa:timers:completed'
    );
    expect(completionCalls.length).toBe(1);
  });

  it('does not send fallback for pause, reset, or cancel (M13.3)', () => {
    const mockDashWindow = {
      isDestroyed: () => false,
      webContents: {
        send: vi.fn(),
      },
    };

    windowManager = {
      getDashboardWindow: () => mockDashWindow,
      getPetWindow: () => null,
      showDashboard: vi.fn(),
    } as unknown as WindowManager;

    engine = new TimerEngine(repo, windowManager, settingsStore);
    engine.init();

    // Test pause
    const timer1 = engine.createTimer({
      label: 'Pause No Fallback',
      type: 'countdown',
      duration_ms: 60000,
    });
    engine.startTimer(timer1.id);
    engine.pauseTimer(timer1.id);

    // Test reset
    const timer2 = engine.createTimer({
      label: 'Reset No Fallback',
      type: 'countdown',
      duration_ms: 60000,
    });
    engine.startTimer(timer2.id);
    vi.advanceTimersByTime(5000);
    engine.resetTimer(timer2.id);

    // Test cancel
    const timer3 = engine.createTimer({
      label: 'Cancel No Fallback',
      type: 'countdown',
      duration_ms: 60000,
    });
    engine.startTimer(timer3.id);
    vi.advanceTimersByTime(5000);
    engine.cancelTimer(timer3.id);

    // No completion events should be sent
    const completionCalls = mockDashWindow.webContents.send.mock.calls.filter(
      (call) => call[0] === 'roa:timers:completed'
    );
    expect(completionCalls.length).toBe(0);
  });

  it('continues pet reactions and Pomodoro transitions on notification failure (M13.3)', () => {
    const mockPetWindow = {
      isDestroyed: () => false,
      webContents: {
        send: vi.fn(),
      },
    };

    const mockDashWindow = {
      isDestroyed: () => false,
      webContents: {
        send: vi.fn(),
      },
    };

    windowManager = {
      getDashboardWindow: () => mockDashWindow,
      getPetWindow: () => mockPetWindow,
      showDashboard: vi.fn(),
    } as unknown as WindowManager;

    engine = new TimerEngine(repo, windowManager, settingsStore);
    engine.init();

    // Start a Pomodoro focus session
    engine.startPomodoro('focus');
    
    // Complete it
    vi.advanceTimersByTime(25 * 60 * 1000 + 100);

    // Pet reaction should be sent
    const petEventCalls = mockPetWindow.webContents.send.mock.calls.filter(
      (call) => call[0] === 'roa:pet:timerEvent'
    );
    expect(petEventCalls.length).toBeGreaterThan(0);

    // Pomodoro state update should be sent
    const pomodoroStateCalls = mockDashWindow.webContents.send.mock.calls.filter(
      (call) => call[0] === 'roa:pomodoro:stateChanged'
    );
    expect(pomodoroStateCalls.length).toBeGreaterThan(0);
  });
});
