import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { Notification } from 'electron';
import { ReminderEngine } from '../../src/main/services/reminder-engine';
import { RemindersRepository } from '../../src/main/services/reminder-engine/reminders.repository';
import { ReminderEventsRepository } from '../../src/main/services/reminder-engine/reminder-events.repository';
import { WindowManager } from '../../src/main/window-manager';
import type { Reminder } from '../../src/shared/types/reminders';

vi.mock('electron', () => {
  class MockNotification {
    static supported = true;
    static throwOnConstruct = false;
    static latest: MockNotification | null = null;

    private handlers = new Map<string, (...args: unknown[]) => void>();

    constructor(_options: unknown) {
      if (MockNotification.throwOnConstruct) {
        throw new Error('notification creation failed');
      }
      MockNotification.latest = this;
    }

    static isSupported() {
      return MockNotification.supported;
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.set(event, handler);
    }

    show() {}

    emit(event: 'show' | 'failed', ...args: unknown[]) {
      this.handlers.get(event)?.(...args);
    }
  }

  return {
    app: { isPackaged: false },
    powerMonitor: { on: vi.fn() },
    Notification: MockNotification,
  };
});

type MockNotificationConstructor = typeof Notification & {
  supported: boolean;
  throwOnConstruct: boolean;
  latest: {
    emit: (event: 'show' | 'failed', ...args: unknown[]) => void;
  } | null;
};

describe('ReminderEngine notification routing', () => {
  let remindersRepo: RemindersRepository;
  let eventsRepo: ReminderEventsRepository;
  let reminderEngine: ReminderEngine;
  let dashboardSend: ReturnType<typeof vi.fn>;
  let petSend: ReturnType<typeof vi.fn>;
  let notification: MockNotificationConstructor;

  const reminder = (): Reminder => ({
    id: 'reminder-1',
    title: 'Hydrate',
    description: 'Drink water',
    schedule_type: 'one_time',
    schedule_data: { targetTimestamp: 1 },
    timezone: 'local',
    enabled: true,
    next_run_at: 1,
    created_at: 1,
    updated_at: 1,
    metadata_json: null,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    notification = Notification as MockNotificationConstructor;
    notification.supported = true;
    notification.throwOnConstruct = false;
    notification.latest = null;
    dashboardSend = vi.fn();
    petSend = vi.fn();

    const db = {
      prepare: () => ({ run: vi.fn(), get: vi.fn(), all: vi.fn() }),
    } as unknown as Database.Database;
    remindersRepo = new RemindersRepository(db);
    eventsRepo = new ReminderEventsRepository(db);
    vi.spyOn(remindersRepo, 'getById').mockImplementation((id) => (id === 'reminder-1' ? reminder() : null));
    vi.spyOn(remindersRepo, 'update').mockImplementation(() => {});
    vi.spyOn(eventsRepo, 'recordCompleted').mockImplementation(() => {});
    vi.spyOn(eventsRepo, 'recordFired').mockImplementation(() => {});

    const windowManager = {
      getDashboardWindow: () => ({ isDestroyed: () => false, webContents: { send: dashboardSend } }),
      getPetWindow: () => ({ isDestroyed: () => false, webContents: { send: petSend } }),
      showDashboard: vi.fn(),
    } as unknown as WindowManager;
    reminderEngine = new ReminderEngine(remindersRepo, eventsRepo, windowManager);
  });

  afterEach(() => {
    reminderEngine.shutdown();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const trigger = () => reminderEngine.triggerReminder('reminder-1');

  const fallbackCalls = () => dashboardSend.mock.calls.filter(
    ([channel]) => channel === 'roa:reminders:notificationFallback'
  );

  it('keeps ordinary reminder updates distinct from fallback feedback', () => {
    trigger();

    expect(dashboardSend).toHaveBeenCalledWith('roa:reminders:triggered', expect.objectContaining({ id: 'reminder-1' }));
    expect(petSend).toHaveBeenCalledWith('roa:pet:reminderFired', expect.objectContaining({ id: 'reminder-1' }));
    expect(fallbackCalls()).toHaveLength(0);
  });

  it('does not emit fallback after a native show confirmation', () => {
    trigger();
    notification.latest?.emit('show');
    vi.advanceTimersByTime(500);

    expect(fallbackCalls()).toHaveLength(0);
  });

  it('emits one fallback event after native notification failure', () => {
    trigger();
    notification.latest?.emit('failed', new Error('blocked'), 'HRESULT:-2143420140');
    vi.advanceTimersByTime(500);

    expect(fallbackCalls()).toEqual([[
      'roa:reminders:notificationFallback',
      { id: 'reminder-1', title: 'Hydrate', description: 'Drink water' },
    ]]);
  });

  it('emits one fallback event when notification creation throws', () => {
    notification.throwOnConstruct = true;
    trigger();

    expect(fallbackCalls()).toEqual([[
      'roa:reminders:notificationFallback',
      { id: 'reminder-1', title: 'Hydrate', description: 'Drink water' },
    ]]);
  });

  it('emits one fallback event when native notifications are unsupported', () => {
    notification.supported = false;
    trigger();

    expect(fallbackCalls()).toEqual([[
      'roa:reminders:notificationFallback',
      { id: 'reminder-1', title: 'Hydrate', description: 'Drink water' },
    ]]);
  });

  it('uses one fallback event after a silent delivery timeout', () => {
    trigger();
    vi.advanceTimersByTime(500);

    expect(fallbackCalls()).toHaveLength(1);
  });

  it('does not duplicate fallback when failure precedes the timeout', () => {
    trigger();
    notification.latest?.emit('failed', new Error('failed'), 'failure');
    vi.advanceTimersByTime(500);

    expect(fallbackCalls()).toHaveLength(1);
  });

  it('does not duplicate fallback when a show event arrives after timeout fallback', () => {
    const log = vi.spyOn(console, 'log');
    trigger();
    vi.advanceTimersByTime(500);
    notification.latest?.emit('show');

    expect(fallbackCalls()).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('confirmed after fallback dispatched'));
  });

  it('preserves M11.1 occurrence protection and reminder persistence', () => {
    trigger();
    trigger();

    expect(petSend).toHaveBeenCalledTimes(1);
    expect(dashboardSend.mock.calls.filter(([channel]) => channel === 'roa:reminders:triggered')).toHaveLength(1);
    expect(remindersRepo.update).toHaveBeenCalledTimes(1);
    expect(eventsRepo.recordFired).toHaveBeenCalledTimes(1);
  });
});
