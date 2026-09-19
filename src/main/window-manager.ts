import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { PetPosition } from '@shared/types/pet';
import { SettingsStore, getSettingsStore } from './services/settings-store';

export class WindowManager {
  private petWindow: BrowserWindow | null = null;
  private dashboardWindow: BrowserWindow | null = null;
  private settingsStore: SettingsStore;
  private moveDebounceTimer: NodeJS.Timeout | null = null;

  constructor(settingsStore?: SettingsStore) {
    this.settingsStore = settingsStore ?? getSettingsStore();
  }

  public getPetWindow(): BrowserWindow | null {
    return this.petWindow;
  }

  public getDashboardWindow(): BrowserWindow | null {
    return this.dashboardWindow;
  }

  public getPrimaryWorkArea(): { x: number; y: number; width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    return primaryDisplay.workArea;
  }

  public createPetWindow(): BrowserWindow {
    if (this.petWindow && !this.petWindow.isDestroyed()) {
      this.petWindow.show();
      this.petWindow.focus();
      return this.petWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;

    // Calculate default position: bottom-right
    const defaultX = workArea.x + workArea.width - 220;
    const defaultY = workArea.y + workArea.height - 220;

    const savedPos = this.settingsStore.get('pet.position');
    const alwaysOnTop = this.settingsStore.get('pet.alwaysOnTop');

    let x = savedPos.x;
    let y = savedPos.y;

    // Validate bounds
    if (x <= 0 || x > workArea.x + workArea.width || y <= 0 || y > workArea.y + workArea.height) {
      x = defaultX;
      y = defaultY;
    }

    this.petWindow = new BrowserWindow({
      width: 200,
      height: 200,
      x,
      y,
      transparent: true,
      frame: false,
      alwaysOnTop,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, '../preload/index.js'),
      },
    });

    this.applySecurityPolicy(this.petWindow);

    // Save position on move (debounced)
    this.petWindow.on('move', () => {
      if (!this.petWindow) return;
      if (this.moveDebounceTimer) {
        clearTimeout(this.moveDebounceTimer);
      }
      this.moveDebounceTimer = setTimeout(() => {
        if (!this.petWindow || this.petWindow.isDestroyed()) return;
        const [currentX, currentY] = this.petWindow.getPosition();
        this.settingsStore.set('pet.position', { x: currentX, y: currentY });
      }, 400);
    });

    this.petWindow.on('closed', () => {
      this.petWindow = null;
    });

    this.loadRenderer(this.petWindow, 'pet');
    return this.petWindow;
  }

  public createDashboardWindow(): BrowserWindow {
    if (this.dashboardWindow && !this.dashboardWindow.isDestroyed()) {
      this.dashboardWindow.show();
      this.dashboardWindow.focus();
      return this.dashboardWindow;
    }

    this.dashboardWindow = new BrowserWindow({
      width: 900,
      height: 650,
      minWidth: 750,
      minHeight: 500,
      frame: true,
      transparent: false,
      alwaysOnTop: false,
      title: 'ROA — Desktop Companion',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, '../preload/index.js'),
      },
    });

    this.applySecurityPolicy(this.dashboardWindow);

    // Hide instead of destroy on close so app stays alive
    this.dashboardWindow.on('close', (event) => {
      if (!(app as unknown as { isQuitting?: boolean }).isQuitting) {
        event.preventDefault();
        this.dashboardWindow?.hide();
      }
    });

    this.dashboardWindow.on('closed', () => {
      this.dashboardWindow = null;
    });

    this.loadRenderer(this.dashboardWindow, 'dashboard');
    return this.dashboardWindow;
  }

  public showDashboard(): void {
    if (!this.dashboardWindow || this.dashboardWindow.isDestroyed()) {
      this.createDashboardWindow();
    } else {
      this.dashboardWindow.show();
      this.dashboardWindow.focus();
    }
  }

  public hideDashboard(): void {
    if (this.dashboardWindow && !this.dashboardWindow.isDestroyed()) {
      this.dashboardWindow.hide();
    }
  }

  public showPet(): void {
    if (!this.petWindow || this.petWindow.isDestroyed()) {
      this.createPetWindow();
    } else {
      this.petWindow.show();
    }
    this.settingsStore.set('pet.visible', true);
  }

  public hidePet(): void {
    if (this.petWindow && !this.petWindow.isDestroyed()) {
      this.petWindow.hide();
    }
    this.settingsStore.set('pet.visible', false);
  }

  public resetPetPosition(): void {
    if (!this.petWindow || this.petWindow.isDestroyed()) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;
    const x = workArea.x + workArea.width - 220;
    const y = workArea.y + workArea.height - 220;
    this.petWindow.setPosition(x, y);
    this.settingsStore.set('pet.position', { x, y });
  }

  public setPetPosition(pos: PetPosition): void {
    if (!this.petWindow || this.petWindow.isDestroyed()) return;
    this.petWindow.setPosition(pos.x, pos.y);
    this.settingsStore.set('pet.position', pos);
  }

  public setPetAlwaysOnTop(flag: boolean): void {
    if (!this.petWindow || this.petWindow.isDestroyed()) return;
    this.petWindow.setAlwaysOnTop(flag);
    this.settingsStore.set('pet.alwaysOnTop', flag);
  }

  private applySecurityPolicy(win: BrowserWindow): void {
    // Prevent opening new windows (target="_blank" or window.open)
    win.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    // Prevent navigation to external sites
    win.webContents.on('will-navigate', (event, url) => {
      const isLocal = url.startsWith('file://') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
      if (!isLocal) {
        event.preventDefault();
      }
    });
  }

  private loadRenderer(win: BrowserWindow, view: 'pet' | 'dashboard'): void {
    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    if (devUrl) {
      win.loadURL(`${devUrl}#/${view}`);
    } else {
      win.loadFile(path.join(__dirname, '../renderer/index.html'), {
        hash: `/${view}`,
      });
    }
  }
}

let windowManagerInstance: WindowManager | null = null;

export function getWindowManager(settingsStore?: SettingsStore): WindowManager {
  if (!windowManagerInstance || settingsStore) {
    windowManagerInstance = new WindowManager(settingsStore);
  }
  return windowManagerInstance;
}
