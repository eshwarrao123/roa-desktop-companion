import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { SystemService } from '../../src/main/services/system-service';
import { SettingsStore } from '../../src/main/services/settings-store';
import { WindowManager } from '../../src/main/window-manager';

let mockIsOnBattery = false;
let mockIdleTime = 0;
let mockLoginItem = { openAtLogin: false };

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
    register: vi.fn().mockReturnValue(true),
    unregister: vi.fn(),
  },
  Notification: class {
    static isSupported() {
      return false;
    }
    show() {}
  },
}));

describe('SystemService', () => {
  let settingsDb: Map<string, any>;
  let mockDb: Database.Database;
  let settingsStore: SettingsStore;
  let windowManager: WindowManager;
  let systemService: SystemService;

  beforeEach(() => {
    settingsDb = new Map();
    mockIsOnBattery = false;
    mockIdleTime = 0;
    mockLoginItem = { openAtLogin: false };

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

    systemService = new SystemService(windowManager, settingsStore);
  });

  it('manages Windows startup login item setting', () => {
    expect(systemService.getStartupStatus()).toBe(false);

    const updated = systemService.setStartupEnabled(true);
    expect(updated).toBe(true);
    expect(systemService.getStartupStatus()).toBe(true);
    expect(settingsStore.get('app.startWithWindows')).toBe(true);

    systemService.setStartupEnabled(false);
    expect(systemService.getStartupStatus()).toBe(false);
  });

  it('reports global shortcut status correctly', () => {
    systemService.init();
    const status = systemService.getShortcutStatus();
    expect(status.registered).toBe(true);
    expect(status.accelerator).toContain('Shift+Space');
    expect(status.error).toBeNull();
  });

  it('detects battery status and AC power state', async () => {
    mockIsOnBattery = false;
    const acStatus = await systemService.getBatteryStatus();
    expect(acStatus.isOnBattery).toBe(false);
    expect(acStatus.isCharging).toBe(true);

    mockIsOnBattery = true;
    const batStatus = await systemService.getBatteryStatus();
    expect(batStatus.isOnBattery).toBe(true);
    expect(batStatus.isCharging).toBe(false);
  });

  it('evaluates idle status based on threshold', () => {
    // Default threshold is 300s
    mockIdleTime = 120;
    const activeStatus = systemService.getIdleStatus();
    expect(activeStatus.isIdle).toBe(false);
    expect(activeStatus.idleTimeSeconds).toBe(120);

    mockIdleTime = 350;
    const idleStatus = systemService.getIdleStatus();
    expect(idleStatus.isIdle).toBe(true);
    expect(idleStatus.idleTimeSeconds).toBe(350);
  });
});
