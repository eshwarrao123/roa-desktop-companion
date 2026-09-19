import { app, globalShortcut, powerMonitor, Notification } from 'electron';
import { execFile } from 'child_process';
import path from 'path';
import { BatteryStatus, SystemIdleStatus, GlobalShortcutStatus } from '@shared/types/system';
import { WindowManager, getWindowManager } from '../window-manager';
import { SettingsStore, getSettingsStore } from './settings-store';

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+Space';
const BATTERY_CHECK_INTERVAL_MS = 60000; // 1 minute
const IDLE_CHECK_INTERVAL_MS = 10000; // 10 seconds

export class SystemService {
  private windowManager: WindowManager;
  private settingsStore: SettingsStore;
  private shortcutStatus: GlobalShortcutStatus = {
    accelerator: DEFAULT_SHORTCUT,
    registered: false,
    error: null,
  };
  private hasAlertedLowBattery = false;
  private isSystemIdle = false;
  private batteryCheckTimer: NodeJS.Timeout | null = null;
  private idleCheckTimer: NodeJS.Timeout | null = null;

  constructor(windowManager?: WindowManager, settingsStore?: SettingsStore) {
    this.windowManager = windowManager ?? getWindowManager();
    this.settingsStore = settingsStore ?? getSettingsStore();
  }

  public init(): void {
    console.log('[SystemService] Initializing system integration services...');

    // 1. Register Global Shortcut
    this.registerShortcut();

    // 2. Setup Battery Monitoring
    this.initBatteryMonitoring();

    // 3. Setup Idle Monitoring
    this.initIdleMonitoring();

    console.log('[SystemService] System integration services initialized.');
  }

  public shutdown(): void {
    console.log('[SystemService] Shutting down system services...');
    if (this.shortcutStatus.registered) {
      globalShortcut.unregister(this.shortcutStatus.accelerator);
      this.shortcutStatus.registered = false;
    }
    if (this.batteryCheckTimer) {
      clearInterval(this.batteryCheckTimer);
      this.batteryCheckTimer = null;
    }
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }
  }

  // ==========================================
  // WINDOWS STARTUP
  // ==========================================

  public getStartupStatus(): boolean {
    try {
      const loginSettings = app.getLoginItemSettings();
      return loginSettings.openAtLogin;
    } catch (err) {
      console.warn('[SystemService] Failed to get startup status:', err);
      return this.settingsStore.get('app.startWithWindows');
    }
  }

  public setStartupEnabled(enabled: boolean): boolean {
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true,
        args: ['--hidden'],
      });
      this.settingsStore.set('app.startWithWindows', enabled);
      return this.getStartupStatus();
    } catch (err) {
      console.error('[SystemService] Failed to set startup status:', err);
      return false;
    }
  }

  // ==========================================
  // GLOBAL SHORTCUT
  // ==========================================

  public getShortcutStatus(): GlobalShortcutStatus {
    return { ...this.shortcutStatus };
  }

  private registerShortcut(): void {
    try {
      const registered = globalShortcut.register(DEFAULT_SHORTCUT, () => {
        console.log('[SystemService] Global shortcut triggered! Toggling dashboard...');
        const dash = this.windowManager.getDashboardWindow();
        if (dash && !dash.isDestroyed() && dash.isVisible()) {
          this.windowManager.hideDashboard();
        } else {
          this.windowManager.showDashboard();
        }
      });

      this.shortcutStatus = {
        accelerator: DEFAULT_SHORTCUT,
        registered,
        error: registered ? null : 'Shortcut could not be registered (may be in use by another app).',
      };

      if (!registered) {
        console.warn(`[SystemService] Failed to register global shortcut: ${DEFAULT_SHORTCUT}`);
      } else {
        console.log(`[SystemService] Registered global shortcut: ${DEFAULT_SHORTCUT}`);
      }
    } catch (err) {
      this.shortcutStatus = {
        accelerator: DEFAULT_SHORTCUT,
        registered: false,
        error: err instanceof Error ? err.message : String(err),
      };
      console.error('[SystemService] Error registering global shortcut:', err);
    }
  }

  // ==========================================
  // BATTERY AWARENESS
  // ==========================================

  public async getBatteryStatus(): Promise<BatteryStatus> {
    const isOnBattery = powerMonitor ? powerMonitor.isOnBatteryPower() : false;
    const percent = await this.queryWindowsBatteryPercent();

    return {
      isOnBattery,
      percent,
      isCharging: !isOnBattery,
    };
  }

  private queryWindowsBatteryPercent(): Promise<number | null> {
    return new Promise((resolve) => {
      // Windows-specific safe command with fixed arguments (no arbitrary shell injection)
      execFile(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          '(Get-CimInstance -ClassName Win32_Battery | Select-Object -ExpandProperty EstimatedChargeRemaining) -join ""',
        ],
        { timeout: 3000 },
        (error, stdout) => {
          if (error) {
            // Likely desktop with no battery
            return resolve(null);
          }
          const trimmed = stdout.trim();
          const parsed = parseInt(trimmed, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            resolve(parsed);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  private initBatteryMonitoring(): void {
    if (powerMonitor) {
      powerMonitor.on('on-ac', () => {
        console.log('[SystemService] Switched to AC power.');
        this.hasAlertedLowBattery = false;
      });

      powerMonitor.on('on-battery', () => {
        console.log('[SystemService] Switched to Battery power.');
        this.checkBatteryLevel();
      });
    }

    // Periodic check
    this.batteryCheckTimer = setInterval(() => {
      this.checkBatteryLevel();
    }, BATTERY_CHECK_INTERVAL_MS);
  }

  private async checkBatteryLevel(): Promise<void> {
    const enabled = this.settingsStore.get('system.lowBatteryNotification');
    if (!enabled) return;

    const threshold = this.settingsStore.get('system.lowBatteryThreshold');
    const { isOnBattery, percent } = await this.getBatteryStatus();

    if (isOnBattery && percent !== null && percent <= threshold) {
      if (!this.hasAlertedLowBattery) {
        this.hasAlertedLowBattery = true;
        console.log(`[SystemService] Low battery detected: ${percent}%. Triggering alert.`);

        // Native notification
        if (Notification.isSupported()) {
          const iconPath = app.isPackaged
            ? path.join(process.resourcesPath, 'assets', 'icons', 'tray.png')
            : path.join(process.cwd(), 'assets', 'icons', 'tray.png');

          new Notification({
            title: 'Low Battery Alert ⚡',
            body: `Battery is at ${percent}%. Please connect to a charger!`,
            icon: iconPath,
          }).show();
        }

        // Pet reaction
        const petWin = this.windowManager.getPetWindow();
        if (petWin && !petWin.isDestroyed()) {
          petWin.webContents.send('roa:pet:timerEvent', {
            type: 'lowBattery',
            title: 'Low Battery',
            message: `Battery is down to ${percent}%! Please plug me in ⚡`,
          });
        }
      }
    } else if (percent !== null && percent > threshold + 5) {
      this.hasAlertedLowBattery = false;
    }
  }

  // ==========================================
  // IDLE AWARENESS
  // ==========================================

  public getIdleStatus(): SystemIdleStatus {
    const idleTimeSeconds = powerMonitor ? powerMonitor.getSystemIdleTime() : 0;
    const threshold = this.settingsStore.get('system.idleThresholdSeconds');
    return {
      idleTimeSeconds,
      isIdle: idleTimeSeconds >= threshold,
    };
  }

  private initIdleMonitoring(): void {
    this.idleCheckTimer = setInterval(() => {
      this.checkIdleState();
    }, IDLE_CHECK_INTERVAL_MS);
  }

  private checkIdleState(): void {
    const reactionEnabled = this.settingsStore.get('system.idleReaction');
    if (!reactionEnabled || !powerMonitor) return;

    const threshold = this.settingsStore.get('system.idleThresholdSeconds');
    const idleTimeSeconds = powerMonitor.getSystemIdleTime();
    const petWin = this.windowManager.getPetWindow();

    if (idleTimeSeconds >= threshold && !this.isSystemIdle) {
      this.isSystemIdle = true;
      console.log(`[SystemService] User idle for ${idleTimeSeconds}s. Pet entering sleep...`);
      if (petWin && !petWin.isDestroyed()) {
        petWin.webContents.send('roa:pet:timerEvent', {
          type: 'systemIdle',
          title: 'Zzz...',
          message: 'Taking a quick nap while you are away 💤',
        });
      }
    } else if (idleTimeSeconds < 5 && this.isSystemIdle) {
      this.isSystemIdle = false;
      console.log('[SystemService] User active again. Waking pet up...');
      if (petWin && !petWin.isDestroyed()) {
        petWin.webContents.send('roa:pet:timerEvent', {
          type: 'systemActive',
          title: 'Welcome back!',
          message: 'Ready to help! ✨',
        });
      }
    }
  }
}

let systemServiceInstance: SystemService | null = null;

export function getSystemService(
  windowManager?: WindowManager,
  settingsStore?: SettingsStore
): SystemService {
  if (!systemServiceInstance || windowManager || settingsStore) {
    systemServiceInstance = new SystemService(windowManager, settingsStore);
  }
  return systemServiceInstance;
}
