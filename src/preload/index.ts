import { contextBridge, ipcRenderer } from 'electron';
import { ElectronRoaAPI } from '@shared/types/ipc';
import { PetMood, PetPosition } from '@shared/types/pet';
import { AppSettings, SettingKey } from '@shared/types/settings';

const roaApi: ElectronRoaAPI = {
  pet: {
    getPosition: () => ipcRenderer.invoke('roa:pet:getPosition'),
    setPosition: (pos: PetPosition) => ipcRenderer.invoke('roa:pet:setPosition', pos),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('roa:pet:setAlwaysOnTop', flag),
    setMood: (mood: PetMood) => ipcRenderer.invoke('roa:pet:setMood', mood),
    onMoodChanged: (callback: (mood: PetMood) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, mood: PetMood) => callback(mood);
      ipcRenderer.on('roa:pet:moodChanged', handler);
      return () => {
        ipcRenderer.removeListener('roa:pet:moodChanged', handler);
      };
    },
    openContextMenu: () => ipcRenderer.invoke('roa:pet:openContextMenu'),
  },
  dashboard: {
    open: () => ipcRenderer.invoke('roa:dashboard:open'),
    close: () => ipcRenderer.invoke('roa:dashboard:close'),
  },
  character: {
    getActive: () => ipcRenderer.invoke('roa:character:getActive'),
    list: () => ipcRenderer.invoke('roa:character:list'),
  },
  settings: {
    get: <K extends SettingKey>(key: K) => ipcRenderer.invoke('roa:settings:get', key),
    getAll: () => ipcRenderer.invoke('roa:settings:getAll'),
    set: <K extends SettingKey>(key: K, value: AppSettings[K]) =>
      ipcRenderer.invoke('roa:settings:set', key, value),
    onChanged: (callback: (settings: Partial<AppSettings>) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, settings: Partial<AppSettings>) =>
        callback(settings);
      ipcRenderer.on('roa:settings:changed', handler);
      return () => {
        ipcRenderer.removeListener('roa:settings:changed', handler);
      };
    },
  },
  app: {
    quit: () => ipcRenderer.invoke('roa:app:quit'),
    getVersion: () => ipcRenderer.invoke('roa:app:getVersion'),
    showPet: () => ipcRenderer.invoke('roa:app:showPet'),
    hidePet: () => ipcRenderer.invoke('roa:app:hidePet'),
    resetPetPosition: () => ipcRenderer.invoke('roa:app:resetPetPosition'),
  },
};

contextBridge.exposeInMainWorld('roa', roaApi);
