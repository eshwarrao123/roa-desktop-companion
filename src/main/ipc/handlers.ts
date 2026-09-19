import { ipcMain, Menu, BrowserWindow, app } from 'electron';
import { z } from 'zod';
import {
  PetMood,
  PetMoodSchema,
  PetBehavior,
  PetBehaviorSchema,
  PetPosition,
  PetPositionSchema,
  PetState,
} from '@shared/types/pet';
import { AppSettings, SettingKey } from '@shared/types/settings';
import {
  CreateReminderInputSchema,
  UpdateReminderInputSchema,
  SnoozeInputSchema,
  Reminder,
  ReminderHistory,
} from '@shared/types/reminders';
import { WindowManager, getWindowManager } from '../window-manager';
import { SettingsStore, getSettingsStore } from '../services/settings-store';
import { CharacterRegistry, getCharacterRegistry } from '../services/character-registry';
import { getReminderEngine, ReminderEngine } from '../services/reminder-engine';
import { getTrayManager } from '../tray';

export function registerIpcHandlers(
  windowManager?: WindowManager,
  settingsStore?: SettingsStore,
  characterRegistry?: CharacterRegistry,
  reminderEngine?: ReminderEngine
): void {
  const winManager = windowManager ?? getWindowManager();
  const store = settingsStore ?? getSettingsStore();
  const registry = characterRegistry ?? getCharacterRegistry();
  const engine = reminderEngine ?? getReminderEngine();
  const tray = getTrayManager(winManager, store);
  let currentBehavior: PetBehavior = 'idle';

  // Pet handlers
  ipcMain.handle('roa:pet:getPosition', async (): Promise<PetPosition> => {
    const petWin = winManager.getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      const [x, y] = petWin.getPosition();
      return { x, y };
    }
    return store.get('pet.position');
  });

  ipcMain.handle('roa:pet:setPosition', async (_event, rawPos: unknown): Promise<void> => {
    const pos = PetPositionSchema.parse(rawPos);
    winManager.setPetPosition(pos);
  });

  ipcMain.handle('roa:pet:setAlwaysOnTop', async (_event, rawFlag: unknown): Promise<void> => {
    const flag = z.boolean().parse(rawFlag);
    winManager.setPetAlwaysOnTop(flag);
  });

  ipcMain.handle('roa:pet:setMood', async (_event, rawMood: unknown): Promise<void> => {
    const mood = PetMoodSchema.parse(rawMood);
    store.set('pet.currentMood', mood);

    // Broadcast to pet window
    const petWin = winManager.getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('roa:pet:moodChanged', mood);
    }
    tray.updateContextMenu();
  });

  ipcMain.handle('roa:pet:setBehavior', async (_event, rawBehavior: unknown): Promise<void> => {
    const behavior = PetBehaviorSchema.parse(rawBehavior);
    currentBehavior = behavior;
    const petWin = winManager.getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('roa:pet:behaviorChanged', behavior);
    }
  });

  ipcMain.handle('roa:pet:getState', async (): Promise<PetState> => {
    const petWin = winManager.getPetWindow();
    const pos =
      petWin && !petWin.isDestroyed()
        ? { x: petWin.getPosition()[0], y: petWin.getPosition()[1] }
        : store.get('pet.position');

    return {
      characterId: store.get('pet.activeCharacterId'),
      mood: store.get('pet.currentMood'),
      behavior: currentBehavior,
      position: pos,
      alwaysOnTop: store.get('pet.alwaysOnTop'),
      visible: store.get('pet.visible'),
    };
  });

  ipcMain.handle('roa:pet:getWorkAreaBounds', async () => {
    return winManager.getPrimaryWorkArea();
  });

  ipcMain.handle('roa:pet:openContextMenu', async (event): Promise<void> => {
    const currentMood = store.get('pet.currentMood');
    const senderWin = BrowserWindow.fromWebContents(event.sender);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Mood',
        submenu: [
          {
            label: 'Idle',
            type: 'radio',
            checked: currentMood === 'idle',
            click: () => {
              store.set('pet.currentMood', 'idle');
              senderWin?.webContents.send('roa:pet:moodChanged', 'idle');
              tray.updateContextMenu();
            },
          },
          {
            label: 'Happy',
            type: 'radio',
            checked: currentMood === 'happy',
            click: () => {
              store.set('pet.currentMood', 'happy');
              senderWin?.webContents.send('roa:pet:moodChanged', 'happy');
              tray.updateContextMenu();
            },
          },
          {
            label: 'Sleeping',
            type: 'radio',
            checked: currentMood === 'sleeping',
            click: () => {
              store.set('pet.currentMood', 'sleeping');
              senderWin?.webContents.send('roa:pet:moodChanged', 'sleeping');
              tray.updateContextMenu();
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Open Dashboard',
        click: () => winManager.showDashboard(),
      },
      {
        label: 'Reset Position',
        click: () => winManager.resetPetPosition(),
      },
      {
        label: 'Hide Pet',
        click: () => winManager.hidePet(),
      },
      { type: 'separator' },
      {
        label: 'Quit ROA',
        click: () => {
          (app as unknown as { isQuitting: boolean }).isQuitting = true;
          app.quit();
        },
      },
    ]);

    if (senderWin && !senderWin.isDestroyed()) {
      contextMenu.popup({ window: senderWin });
    }
  });

  // Dashboard handlers
  ipcMain.handle('roa:dashboard:open', async (): Promise<void> => {
    winManager.showDashboard();
  });

  ipcMain.handle('roa:dashboard:close', async (): Promise<void> => {
    winManager.hideDashboard();
  });

  // Character handlers
  ipcMain.handle('roa:character:getActive', async () => {
    return registry.getActive();
  });

  ipcMain.handle('roa:character:list', async () => {
    return registry.list();
  });

  ipcMain.handle('roa:character:setActive', async (_event, rawId: unknown): Promise<void> => {
    const id = z.string().min(1).parse(rawId);
    const character = registry.setActive(id);

    // Broadcast to pet window and dashboard
    const petWin = winManager.getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('roa:character:changed', character);
    }
    const dashWin = winManager.getDashboardWindow();
    if (dashWin && !dashWin.isDestroyed()) {
      dashWin.webContents.send('roa:character:changed', character);
    }
  });

  // Reminder handlers (Zod-validated)
  ipcMain.handle('roa:reminders:list', async (): Promise<Reminder[]> => {
    return engine.list();
  });

  ipcMain.handle('roa:reminders:get', async (_event, rawId: unknown): Promise<Reminder | null> => {
    const id = z.string().min(1).parse(rawId);
    return engine.get(id);
  });

  ipcMain.handle('roa:reminders:create', async (_event, rawInput: unknown): Promise<Reminder> => {
    const input = CreateReminderInputSchema.parse(rawInput);
    return engine.create(input);
  });

  ipcMain.handle(
    'roa:reminders:update',
    async (_event, rawId: unknown, rawInput: unknown): Promise<Reminder> => {
      const id = z.string().min(1).parse(rawId);
      const input = UpdateReminderInputSchema.parse(rawInput);
      return engine.update(id, input);
    }
  );

  ipcMain.handle('roa:reminders:delete', async (_event, rawId: unknown): Promise<void> => {
    const id = z.string().min(1).parse(rawId);
    engine.delete(id);
  });

  ipcMain.handle('roa:reminders:enable', async (_event, rawId: unknown): Promise<void> => {
    const id = z.string().min(1).parse(rawId);
    engine.enable(id);
  });

  ipcMain.handle('roa:reminders:disable', async (_event, rawId: unknown): Promise<void> => {
    const id = z.string().min(1).parse(rawId);
    engine.disable(id);
  });

  ipcMain.handle(
    'roa:reminders:snooze',
    async (_event, rawId: unknown, rawMinutes: unknown): Promise<void> => {
      const { id, minutes } = SnoozeInputSchema.parse({ id: rawId, minutes: rawMinutes });
      engine.snooze(id, minutes);
    }
  );

  ipcMain.handle(
    'roa:reminders:getHistory',
    async (_event, rawId: unknown, rawLimit: unknown): Promise<ReminderHistory[]> => {
      const id = z.string().min(1).parse(rawId);
      const limit = z.number().int().positive().optional().parse(rawLimit);
      return engine.getHistory(id, limit);
    }
  );

  // Settings handlers
  ipcMain.handle('roa:settings:get', async (_event, key: SettingKey) => {
    return store.get(key);
  });

  ipcMain.handle('roa:settings:getAll', async (): Promise<AppSettings> => {
    return store.getAll();
  });

  ipcMain.handle('roa:settings:set', async (_event, key: SettingKey, value: unknown) => {
    store.set(key, value as AppSettings[SettingKey]);
  });

  // App lifecycle handlers
  ipcMain.handle('roa:app:quit', async (): Promise<void> => {
    (app as unknown as { isQuitting: boolean }).isQuitting = true;
    app.quit();
  });

  ipcMain.handle('roa:app:getVersion', async (): Promise<string> => {
    return app.getVersion();
  });

  ipcMain.handle('roa:app:showPet', async (): Promise<void> => {
    winManager.showPet();
  });

  ipcMain.handle('roa:app:hidePet', async (): Promise<void> => {
    winManager.hidePet();
  });

  ipcMain.handle('roa:app:resetPetPosition', async (): Promise<void> => {
    winManager.resetPetPosition();
  });
}

