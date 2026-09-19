import { ipcMain, Menu, BrowserWindow, app } from 'electron';
import { z } from 'zod';
import { PetMood, PetMoodSchema, PetPosition, PetPositionSchema } from '@shared/types/pet';
import { AppSettings, SettingKey } from '@shared/types/settings';
import { WindowManager, getWindowManager } from '../window-manager';
import { SettingsStore, getSettingsStore } from '../services/settings-store';
import { CharacterRegistry, getCharacterRegistry } from '../services/character-registry';
import { getTrayManager } from '../tray';

export function registerIpcHandlers(
  windowManager?: WindowManager,
  settingsStore?: SettingsStore,
  characterRegistry?: CharacterRegistry
): void {
  const winManager = windowManager ?? getWindowManager();
  const store = settingsStore ?? getSettingsStore();
  const registry = characterRegistry ?? getCharacterRegistry();
  const tray = getTrayManager(winManager, store);

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
