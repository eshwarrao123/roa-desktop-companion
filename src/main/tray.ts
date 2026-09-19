import { Tray, Menu, nativeImage, NativeImage, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { PetMood } from '@shared/types/pet';
import { WindowManager, getWindowManager } from './window-manager';
import { SettingsStore, getSettingsStore } from './services/settings-store';

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;
  private settingsStore: SettingsStore;

  constructor(windowManager?: WindowManager, settingsStore?: SettingsStore) {
    this.windowManager = windowManager ?? getWindowManager();
    this.settingsStore = settingsStore ?? getSettingsStore();
  }

  public init(): Tray {
    if (this.tray) {
      return this.tray;
    }

    const icon = this.getTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('ROA — Desktop Companion');

    this.updateContextMenu();

    this.tray.on('click', () => {
      this.windowManager.showDashboard();
    });

    return this.tray;
  }

  public updateContextMenu(): void {
    if (!this.tray) return;

    const currentMood = this.settingsStore.get('pet.currentMood');

    const isVisible = this.settingsStore.get('pet.visible');
    const isClickThrough = this.settingsStore.get('pet.clickThrough');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open ROA',
        click: () => this.windowManager.showDashboard(),
      },
      { type: 'separator' },
      {
        label: 'Pet Mode',
        submenu: [
          {
            label: 'Normal',
            type: 'radio',
            checked: isVisible && !isClickThrough,
            click: () => {
              this.windowManager.showPet();
              this.windowManager.setPetClickThrough(false);
              this.updateContextMenu();
            },
          },
          {
            label: 'Click-Through',
            type: 'radio',
            checked: isVisible && isClickThrough,
            click: () => {
              this.windowManager.showPet();
              this.windowManager.setPetClickThrough(true);
              this.updateContextMenu();
            },
          },
          {
            label: 'Hidden',
            type: 'radio',
            checked: !isVisible,
            click: () => {
              this.windowManager.hidePet();
              this.updateContextMenu();
            },
          },
        ],
      },
      {
        label: 'Pet Mood',
        submenu: [
          {
            label: 'Idle',
            type: 'radio',
            checked: currentMood === 'idle',
            click: () => this.setMood('idle'),
          },
          {
            label: 'Happy',
            type: 'radio',
            checked: currentMood === 'happy',
            click: () => this.setMood('happy'),
          },
          {
            label: 'Sleeping',
            type: 'radio',
            checked: currentMood === 'sleeping',
            click: () => this.setMood('sleeping'),
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Pomodoro',
        submenu: [
          {
            label: 'Start Focus (25m)',
            click: () => {
              // Lazy import to avoid circular dependency
              import('./services/timer-engine').then(({ getTimerEngine }) => {
                getTimerEngine().startPomodoro('focus');
              });
            },
          },
          {
            label: 'Start Short Break (5m)',
            click: () => {
              import('./services/timer-engine').then(({ getTimerEngine }) => {
                getTimerEngine().startPomodoro('short_break');
              });
            },
          },
          {
            label: 'Start Long Break (15m)',
            click: () => {
              import('./services/timer-engine').then(({ getTimerEngine }) => {
                getTimerEngine().startPomodoro('long_break');
              });
            },
          },
          {
            label: 'Pause / Resume',
            click: () => {
              import('./services/timer-engine').then(({ getTimerEngine }) => {
                const engine = getTimerEngine();
                const state = engine.getPomodoroState();
                if (state.activeTimer?.state === 'running') {
                  engine.pausePomodoro();
                } else if (state.activeTimer?.state === 'paused') {
                  engine.resumePomodoro();
                } else {
                  engine.startPomodoro();
                }
              });
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => this.windowManager.showDashboard(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          (app as unknown as { isQuitting: boolean }).isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private setMood(mood: PetMood): void {
    this.settingsStore.set('pet.currentMood', mood);
    const petWin = this.windowManager.getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('roa:pet:moodChanged', mood);
    }
    this.updateContextMenu();
  }

  private getTrayIcon(): NativeImage {
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icons', 'tray.png')
      : path.join(process.cwd(), 'assets', 'icons', 'tray.png');

    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath);
    }

    // Generate fallback 16x16 icon (purple circle)
    const size = 16;
    const canvasBuffer = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - size / 2 + 0.5;
        const dy = y - size / 2 + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * size + x) * 4;
        if (dist <= size / 2 - 1) {
          // #6366F1 in RGBA
          canvasBuffer[idx] = 99;
          canvasBuffer[idx + 1] = 102;
          canvasBuffer[idx + 2] = 241;
          canvasBuffer[idx + 3] = 255;
        } else {
          canvasBuffer[idx + 3] = 0;
        }
      }
    }
    return nativeImage.createFromBuffer(canvasBuffer, { width: size, height: size });
  }
}

let trayManagerInstance: TrayManager | null = null;

export function getTrayManager(windowManager?: WindowManager, settingsStore?: SettingsStore): TrayManager {
  if (!trayManagerInstance || windowManager || settingsStore) {
    trayManagerInstance = new TrayManager(windowManager, settingsStore);
  }
  return trayManagerInstance;
}
