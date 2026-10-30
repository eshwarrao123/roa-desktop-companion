import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { WindowManager } from '../../src/main/window-manager';
import { SettingsStore } from '../../src/main/services/settings-store';

// Mock Electron
let mockWindows: any[] = [];

vi.mock('electron', () => ({
  BrowserWindow: class MockBrowserWindow {
    private _isDestroyed = false;
    private _isVisible = true;
    webContents = {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
      send: vi.fn(),
    };

    constructor(options: any) {
      mockWindows.push(this);
    }

    isDestroyed() {
      return this._isDestroyed;
    }

    isVisible() {
      return this._isVisible;
    }

    show() {
      this._isVisible = true;
    }

    hide() {
      this._isVisible = false;
    }

    focus() {}

    getPosition() {
      return [100, 100];
    }

    setPosition() {}

    setAlwaysOnTop() {}

    setIgnoreMouseEvents() {}

    on(event: string, handler: Function) {
      if (event === 'close') {
        this.closeHandler = handler;
      } else if (event === 'closed') {
        this.closedHandler = handler;
      } else if (event === 'move') {
        this.moveHandler = handler;
      }
    }

    loadURL() {
      return Promise.resolve();
    }

    loadFile() {
      return Promise.resolve();
    }

    destroy() {
      this._isDestroyed = true;
      if (this.closedHandler) {
        this.closedHandler();
      }
    }

    closeHandler?: Function;
    closedHandler?: Function;
    moveHandler?: Function;
  } as any,
  screen: {
    getPrimaryDisplay: () => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
  },
  app: {
    isPackaged: false,
    isQuitting: false,
  },
}));

describe('WindowManager', () => {
  let settingsDb: Map<string, any>;
  let mockDb: Database.Database;
  let settingsStore: SettingsStore;
  let windowManager: WindowManager;

  beforeEach(() => {
    mockWindows = [];
    settingsDb = new Map();

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
    windowManager = new WindowManager(settingsStore);
  });

  it('creates dashboard window only once when called multiple times', () => {
    const dash1 = windowManager.createDashboardWindow();
    const dash2 = windowManager.createDashboardWindow();
    
    expect(dash1).toBe(dash2);
    expect(mockWindows.length).toBe(1);
  });

  it('creates pet window only once when called multiple times', () => {
    const pet1 = windowManager.createPetWindow();
    const pet2 = windowManager.createPetWindow();
    
    expect(pet1).toBe(pet2);
    expect(mockWindows.length).toBe(1);
  });

  it('recreates dashboard after it is destroyed', () => {
    const dash1 = windowManager.createDashboardWindow();
    dash1.destroy();
    
    const dash2 = windowManager.createDashboardWindow();
    expect(dash2).not.toBe(dash1);
    expect(dash2.isDestroyed()).toBe(false);
  });

  it('recreates pet after it is destroyed', () => {
    const pet1 = windowManager.createPetWindow();
    pet1.destroy();
    
    const pet2 = windowManager.createPetWindow();
    expect(pet2).not.toBe(pet1);
    expect(pet2.isDestroyed()).toBe(false);
  });

  it('showDashboard creates dashboard if not exists', () => {
    windowManager.showDashboard();
    
    const dash = windowManager.getDashboardWindow();
    expect(dash).not.toBeNull();
    expect(dash?.isVisible()).toBe(true);
  });

  it('showDashboard shows existing hidden dashboard', () => {
    windowManager.createDashboardWindow();
    windowManager.hideDashboard();
    
    const dash = windowManager.getDashboardWindow();
    expect(dash?.isVisible()).toBe(false);
    
    windowManager.showDashboard();
    expect(dash?.isVisible()).toBe(true);
  });

  it('showPet creates pet if not exists', () => {
    windowManager.showPet();
    
    const pet = windowManager.getPetWindow();
    expect(pet).not.toBeNull();
    expect(settingsStore.get('pet.visible')).toBe(true);
  });

  it('hidePet updates visibility setting', () => {
    windowManager.createPetWindow();
    windowManager.hidePet();
    
    expect(settingsStore.get('pet.visible')).toBe(false);
  });

  it('safely handles operations on destroyed dashboard window', () => {
    windowManager.createDashboardWindow();
    const dash = windowManager.getDashboardWindow();
    dash?.destroy();
    
    // Should not throw
    expect(() => windowManager.hideDashboard()).not.toThrow();
    expect(() => windowManager.showDashboard()).not.toThrow();
  });

  it('safely handles operations on destroyed pet window', () => {
    windowManager.createPetWindow();
    const pet = windowManager.getPetWindow();
    pet?.destroy();
    
    // Should not throw
    expect(() => windowManager.hidePet()).not.toThrow();
    expect(() => windowManager.showPet()).not.toThrow();
    expect(() => windowManager.resetPetPosition()).not.toThrow();
    expect(() => windowManager.setPetAlwaysOnTop(true)).not.toThrow();
    expect(() => windowManager.setPetClickThrough(true)).not.toThrow();
  });
});
