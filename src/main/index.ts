import { app, BrowserWindow } from 'electron';
import { initDb, closeDb } from './db';
import { getSettingsStore } from './services/settings-store';
import { getCharacterRegistry } from './services/character-registry';
import { getWindowManager } from './window-manager';
import { getTrayManager } from './tray';
import { registerIpcHandlers } from './ipc/handlers';
import { getReminderEngine } from './services/reminder-engine';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
} else {
  let isQuitting = false;
  (app as unknown as { isQuitting: boolean }).isQuitting = false;

  app.on('second-instance', () => {
    const winManager = getWindowManager();
    winManager.showDashboard();
    winManager.showPet();
  });

  app.whenReady().then(() => {
    console.log('[Main] ROA starting up...');

    // 1. Initialize SQLite and run migrations
    initDb();

    // 2. Initialize Settings & Character Registry
    const settingsStore = getSettingsStore();
    const characterRegistry = getCharacterRegistry(settingsStore);

    // 3. Initialize Window Manager
    const windowManager = getWindowManager(settingsStore);

    // 4. Initialize Local Reminder Engine (Phase 2)
    const reminderEngine = getReminderEngine(undefined, undefined, windowManager);
    reminderEngine.init();

    // 5. Initialize Tray
    const trayManager = getTrayManager(windowManager, settingsStore);
    trayManager.init();

    // 6. Register IPC Handlers
    registerIpcHandlers(windowManager, settingsStore, characterRegistry, reminderEngine);

    // 7. Launch Pet Window if visible setting is true
    const petVisible = settingsStore.get('pet.visible');
    if (petVisible) {
      windowManager.createPetWindow();
    }

    console.log('[Main] ROA shell initialized successfully with Reminder Engine.');
  });

  app.on('before-quit', () => {
    isQuitting = true;
    (app as unknown as { isQuitting: boolean }).isQuitting = true;
    getReminderEngine().shutdown();
    closeDb();
  });

  // Tray is lifecycle owner: keep app running when all windows are closed
  app.on('window-all-closed', () => {
    // Keep running in tray; do not quit
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const windowManager = getWindowManager();
      windowManager.createPetWindow();
    }
  });
}
