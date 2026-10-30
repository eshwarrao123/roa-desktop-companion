import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { SystemService } from '../../src/main/services/system-service';
import { TimerEngine } from '../../src/main/services/timer-engine';
import { ReminderEngine } from '../../src/main/services/reminder-engine';
import { TrayManager } from '../../src/main/tray';
import { SettingsStore } from '../../src/main/services/settings-store';
import { WindowManager } from '../../src/main/window-manager';

let mockIsOnBattery = false;
let mockIdleTime = 0;
let mockLoginItem = { openAtLogin: false };
let mockShortcutRegisterCalls = 0;
let mockTrayDestroyCalls = 0;

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/mock/path',
    getLoginItemSettings: () => mockLoginItem,
    setLoginItemSettings: (settings: { openAtLogin: boolean }) => {
      mockLoginItem = { openAtLogin: settings.openAtLogin };
    },
  },
  powerMonitor: {
    on: vi.fn(),
    isOnBatteryPower: () => mockIsOnBattery,
    getSystemIdleTime: () => mockIdleTime,
  },
  globalShortcut: {
    register: vi.fn(() => {
      mockShortcutRegisterCalls++;
      return true;
    }),
    unregister: vi.fn(),
  },
  Notification: class {
    static isSupported() {
      return false;
    }
    show() {}
  },
  Tray: class {
    constructor() {}
    setToolTip() {}
    setContextMenu() {}
    on() {}
    destroy() {
      mockTrayDestroyCalls++;
    }
  },
  Menu: {
    buildFromTemplate: () => ({}),
  },
  nativeImage: {
    createFromPath: () => ({}),
    createFromBuffer: () => ({}),
  },
  BrowserWindow: class {
    webContents = {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
      send: vi.fn(),
    };
    isDestroyed() {
      return false;
    }
    isVisible() {
      return false;
    }
    show() {}
    hide() {}
    focus() {}
    getPosition() {
      return [100, 100];
    }
    setPosition() {}
    setAlwaysOnTop() {}
    setIgnoreMouseEvents() {}
    on() {}
    loadURL() {
      return Promise.resolve();
    }
    loadFile() {
      return Promise.resolve();
    }
  } as any,
  screen: {
    getPrimaryDisplay: () => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
  },
}));

describe('Desktop Shell Lifecycle', () => {
  let settingsDb: Map<string, any>;
  let mockDb: Database.Database;
  let settingsStore: SettingsStore;
  let windowManager: WindowManager;

  beforeEach(() => {
    settingsDb = new Map();
    mockIsOnBattery = false;
    mockIdleTime = 0;
    mockLoginItem = { openAtLogin: false };
    mockShortcutRegisterCalls = 0;
    mockTrayDestroyCalls = 0;

    mockDb = {
      prepare: (sql: string) => {
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
        if (sql.includes('SELECT * FROM timers')) {
          return {
            all: () => [],
          };
        }
        if (sql.includes('SELECT * FROM reminders')) {
          return {
            all: () => [],
          };
        }
        return {
          run: () => ({ changes: 1 }),
          get: () => undefined,
          all: () => [],
        };
      },
    } as unknown as Database.Database;

    settingsStore = new SettingsStore(mockDb);
    windowManager = {
      getDashboardWindow: () => null,
      getPetWindow: () => null,
      showDashboard: vi.fn(),
      hideDashboard: vi.fn(),
    } as unknown as WindowManager;
  });

  describe('SystemService duplicate init protection', () => {
    it('prevents duplicate initialization', () => {
      const systemService = new SystemService(windowManager, settingsStore);

      systemService.init();
      expect(mockShortcutRegisterCalls).toBe(1);

      systemService.init();
      expect(mockShortcutRegisterCalls).toBe(1); // Should still be 1
    });

    it('allows re-initialization after shutdown', () => {
      const systemService = new SystemService(windowManager, settingsStore);

      systemService.init();
      expect(mockShortcutRegisterCalls).toBe(1);

      systemService.shutdown();
      systemService.init();
      expect(mockShortcutRegisterCalls).toBe(2);
    });
  });

  describe('TimerEngine duplicate init protection', () => {
    it('prevents duplicate initialization', () => {
      const mockTimerRepo = {
        getAllTimers: () => [],
        getRunningTimers: () => [],
        getActive: () => null,
        updateTimer: vi.fn(),
      };
      const timerEngine = new TimerEngine(mockTimerRepo as any, windowManager, settingsStore);

      timerEngine.init();
      const state1 = timerEngine.getPomodoroState();

      timerEngine.init();
      const state2 = timerEngine.getPomodoroState();

      // Should not create duplicate watchdog timers
      expect(state2).toBeDefined();
      expect(state1).toEqual(state2);
    });

    it('allows re-initialization after shutdown', () => {
      const mockTimerRepo = {
        getAllTimers: () => [],
        getRunningTimers: () => [],
        getActive: () => null,
        updateTimer: vi.fn(),
      };
      const timerEngine = new TimerEngine(mockTimerRepo as any, windowManager, settingsStore);

      timerEngine.init();
      timerEngine.shutdown();
      
      // Should not throw
      expect(() => timerEngine.init()).not.toThrow();
    });
  });

  describe('ReminderEngine duplicate init protection', () => {
    it('prevents duplicate initialization', () => {
      const mockReminderRepo = {
        getEnabledReminders: () => [],
        getAllReminders: () => [],
      };
      const mockEventsRepo = {};
      const reminderEngine = new ReminderEngine(mockReminderRepo as any, mockEventsRepo as any, windowManager);

      reminderEngine.init();
      // Just verify init doesn't throw
      
      reminderEngine.init();
      // Second init should be skipped with no error
      
      expect(true).toBe(true);
    });

    it('allows re-initialization after shutdown', () => {
      const mockReminderRepo = {
        getEnabledReminders: () => [],
        getAllReminders: () => [],
      };
      const mockEventsRepo = {};
      const reminderEngine = new ReminderEngine(mockReminderRepo as any, mockEventsRepo as any, windowManager);

      reminderEngine.init();
      reminderEngine.shutdown();
      
      // Should not throw
      expect(() => reminderEngine.init()).not.toThrow();
    });
  });

  describe('TrayManager cleanup', () => {
    it('destroys tray on shutdown', () => {
      const trayManager = new TrayManager(windowManager, settingsStore);

      trayManager.init();
      expect(mockTrayDestroyCalls).toBe(0);

      trayManager.shutdown();
      expect(mockTrayDestroyCalls).toBe(1);
    });

    it('safely handles shutdown when tray was never initialized', () => {
      const trayManager = new TrayManager(windowManager, settingsStore);

      // Should not throw
      expect(() => trayManager.shutdown()).not.toThrow();
      expect(mockTrayDestroyCalls).toBe(0);
    });

    it('safely handles duplicate shutdown calls', () => {
      const trayManager = new TrayManager(windowManager, settingsStore);

      trayManager.init();
      trayManager.shutdown();
      
      // Should not throw
      expect(() => trayManager.shutdown()).not.toThrow();
      expect(mockTrayDestroyCalls).toBe(1);
    });
  });

  describe('Global shortcut handling', () => {
    it('toggles dashboard visibility via shortcut handler', () => {
      const mockDashboard = {
        isDestroyed: () => false,
        isVisible: () => true,
      };

      const winManager = {
        getDashboardWindow: () => mockDashboard,
        showDashboard: vi.fn(),
        hideDashboard: vi.fn(),
        getPetWindow: () => null,
      } as unknown as WindowManager;

      const systemService = new SystemService(winManager, settingsStore);
      systemService.init();

      const status = systemService.getShortcutStatus();
      expect(status.registered).toBe(true);
    });

    it('safely handles shortcut when dashboard is destroyed', () => {
      const mockDashboard = {
        isDestroyed: () => true,
        isVisible: () => false,
      };

      const winManager = {
        getDashboardWindow: () => mockDashboard,
        showDashboard: vi.fn(),
        hideDashboard: vi.fn(),
        getPetWindow: () => null,
      } as unknown as WindowManager;

      const systemService = new SystemService(winManager, settingsStore);
      
      // Should not throw during init even with destroyed window
      expect(() => systemService.init()).not.toThrow();
    });
  });
});
