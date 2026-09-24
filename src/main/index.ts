// Prevent ELECTRON_RUN_AS_NODE from leaking to child processes
// (e.g., when launched from VS Code's integrated terminal)
delete process.env.ELECTRON_RUN_AS_NODE;

import { app, BrowserWindow } from 'electron';
import { initDb, closeDb } from './db';
import { getSettingsStore } from './services/settings-store';
import { getCharacterRegistry } from './services/character-registry';
import { getWindowManager } from './window-manager';
import { getTrayManager } from './tray';
import { registerIpcHandlers } from './ipc/handlers';
import { getReminderEngine } from './services/reminder-engine';
import { getTimerEngine } from './services/timer-engine';
import { getSystemService } from './services/system-service';
import { getAIService } from './services/ai/ai-service';

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

    // 5. Initialize Timer & Pomodoro Engine (Phase 4)
    const timerEngine = getTimerEngine(undefined, windowManager, settingsStore);
    timerEngine.init();

    // 6. Initialize System Service (Startup, Shortcut, Battery, Idle) (Phase 4)
    const systemService = getSystemService(windowManager, settingsStore);
    systemService.init();

    // 7. Initialize Tray
    const trayManager = getTrayManager(windowManager, settingsStore);
    trayManager.init();

    // 8. Initialize AI Service (Phase 5)
    const aiService = getAIService(
      settingsStore,
      characterRegistry,
      reminderEngine,
      timerEngine,
      systemService,
      windowManager
    );

    // 9. Register IPC Handlers
    registerIpcHandlers(
      windowManager,
      settingsStore,
      characterRegistry,
      reminderEngine,
      timerEngine,
      systemService,
      aiService
    );

    // 9. Launch Pet Window if visible setting is true
    const petVisible = settingsStore.get('pet.visible');
    if (petVisible) {
      windowManager.createPetWindow();
    }

    console.log('[Main] ROA shell initialized successfully with Reminders, Timers, and System integration.');
  });

  app.on('before-quit', () => {
    isQuitting = true;
    (app as unknown as { isQuitting: boolean }).isQuitting = true;
    getReminderEngine().shutdown();
    getTimerEngine().shutdown();
    getSystemService().shutdown();
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
