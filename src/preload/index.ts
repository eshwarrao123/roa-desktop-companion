import { contextBridge, ipcRenderer } from 'electron';
import { ElectronRoaAPI } from '@shared/types/ipc';
import { PetMood, PetBehavior, PetPosition, CharacterManifest, PetState } from '@shared/types/pet';
import { AppSettings, SettingKey } from '@shared/types/settings';
import {
  Reminder,
  CreateReminderInput,
  UpdateReminderInput,
  ReminderHistory,
} from '@shared/types/reminders';

const roaApi: ElectronRoaAPI = {
  pet: {
    getPosition: () => ipcRenderer.invoke('roa:pet:getPosition'),
    setPosition: (pos: PetPosition) => ipcRenderer.invoke('roa:pet:setPosition', pos),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('roa:pet:setAlwaysOnTop', flag),
    setMood: (mood: PetMood) => ipcRenderer.invoke('roa:pet:setMood', mood),
    setBehavior: (behavior: PetBehavior) => ipcRenderer.invoke('roa:pet:setBehavior', behavior),
    setClickThrough: (enabled: boolean) => ipcRenderer.invoke('roa:pet:setClickThrough', enabled),
    getState: () => ipcRenderer.invoke('roa:pet:getState'),
    getWorkAreaBounds: () => ipcRenderer.invoke('roa:pet:getWorkAreaBounds'),
    onMoodChanged: (callback: (mood: PetMood) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, mood: PetMood) => callback(mood);
      ipcRenderer.on('roa:pet:moodChanged', handler);
      return () => {
        ipcRenderer.removeListener('roa:pet:moodChanged', handler);
      };
    },
    onBehaviorChanged: (callback: (behavior: PetBehavior) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, behavior: PetBehavior) =>
        callback(behavior);
      ipcRenderer.on('roa:pet:behaviorChanged', handler);
      return () => {
        ipcRenderer.removeListener('roa:pet:behaviorChanged', handler);
      };
    },
    onReminderFired: (callback: (reminder: Reminder) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, reminder: Reminder) =>
        callback(reminder);
      ipcRenderer.on('roa:pet:reminderFired', handler);
      return () => {
        ipcRenderer.removeListener('roa:pet:reminderFired', handler);
      };
    },
    onTimerEvent: (callback: (event: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, eventData: any) =>
        callback(eventData);
      ipcRenderer.on('roa:pet:timerEvent', handler);
      return () => {
        ipcRenderer.removeListener('roa:pet:timerEvent', handler);
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
    setActive: (id: string) => ipcRenderer.invoke('roa:character:setActive', id),
    onChanged: (callback: (character: CharacterManifest) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, character: CharacterManifest) =>
        callback(character);
      ipcRenderer.on('roa:character:changed', handler);
      return () => {
        ipcRenderer.removeListener('roa:character:changed', handler);
      };
    },
  },
  reminders: {
    list: () => ipcRenderer.invoke('roa:reminders:list'),
    get: (id: string) => ipcRenderer.invoke('roa:reminders:get', id),
    create: (input: CreateReminderInput) => ipcRenderer.invoke('roa:reminders:create', input),
    update: (id: string, input: UpdateReminderInput) =>
      ipcRenderer.invoke('roa:reminders:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('roa:reminders:delete', id),
    enable: (id: string) => ipcRenderer.invoke('roa:reminders:enable', id),
    disable: (id: string) => ipcRenderer.invoke('roa:reminders:disable', id),
    snooze: (id: string, minutes: number) =>
      ipcRenderer.invoke('roa:reminders:snooze', id, minutes),
    getHistory: (reminderId: string, limit?: number) =>
      ipcRenderer.invoke('roa:reminders:getHistory', reminderId, limit),
    onReminderTriggered: (callback: (reminder: Reminder) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, reminder: Reminder) =>
        callback(reminder);
      ipcRenderer.on('roa:reminders:triggered', handler);
      return () => {
        ipcRenderer.removeListener('roa:reminders:triggered', handler);
      };
    },
  },
  timers: {
    list: (limit?: number) => ipcRenderer.invoke('roa:timers:list', limit),
    get: (id: string) => ipcRenderer.invoke('roa:timers:get', id),
    create: (input: any) => ipcRenderer.invoke('roa:timers:create', input),
    start: (id: string) => ipcRenderer.invoke('roa:timers:start', id),
    pause: (id: string) => ipcRenderer.invoke('roa:timers:pause', id),
    resume: (id: string) => ipcRenderer.invoke('roa:timers:resume', id),
    reset: (id: string) => ipcRenderer.invoke('roa:timers:reset', id),
    cancel: (id: string) => ipcRenderer.invoke('roa:timers:cancel', id),
    getActive: () => ipcRenderer.invoke('roa:timers:getActive'),
    onStateChanged: (callback: (timer: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, timer: any) => callback(timer);
      ipcRenderer.on('roa:timers:stateChanged', handler);
      return () => {
        ipcRenderer.removeListener('roa:timers:stateChanged', handler);
      };
    },
  },
  pomodoro: {
    getState: () => ipcRenderer.invoke('roa:pomodoro:getState'),
    start: (phase?: any) => ipcRenderer.invoke('roa:pomodoro:start', phase),
    pause: () => ipcRenderer.invoke('roa:pomodoro:pause'),
    resume: () => ipcRenderer.invoke('roa:pomodoro:resume'),
    reset: () => ipcRenderer.invoke('roa:pomodoro:reset'),
    skip: () => ipcRenderer.invoke('roa:pomodoro:skip'),
    onStateChanged: (callback: (state: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: any) => callback(state);
      ipcRenderer.on('roa:pomodoro:stateChanged', handler);
      return () => {
        ipcRenderer.removeListener('roa:pomodoro:stateChanged', handler);
      };
    },
  },
  system: {
    getBatteryStatus: () => ipcRenderer.invoke('roa:system:getBatteryStatus'),
    getIdleStatus: () => ipcRenderer.invoke('roa:system:getIdleStatus'),
    getStartupStatus: () => ipcRenderer.invoke('roa:system:getStartupStatus'),
    setStartupEnabled: (enabled: boolean) =>
      ipcRenderer.invoke('roa:system:setStartupEnabled', enabled),
  },
  shortcuts: {
    getStatus: () => ipcRenderer.invoke('roa:shortcuts:getStatus'),
  },
  ai: {
    getStatus: () => ipcRenderer.invoke('roa:ai:getStatus'),
    testConnection: (apiKey?: string) => ipcRenderer.invoke('roa:ai:testConnection', apiKey),
    saveCredential: (apiKey: string, model?: string) =>
      ipcRenderer.invoke('roa:ai:saveCredential', apiKey, model),
    removeCredential: () => ipcRenderer.invoke('roa:ai:removeCredential'),
    chat: (message: string) => ipcRenderer.invoke('roa:ai:chat', message),
    getMessages: () => ipcRenderer.invoke('roa:ai:getMessages'),
    clearConversation: () => ipcRenderer.invoke('roa:ai:clearConversation'),
    onToolActivity: (callback: (activity: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, activity: any) =>
        callback(activity);
      ipcRenderer.on('roa:ai:toolActivity', handler);
      return () => {
        ipcRenderer.removeListener('roa:ai:toolActivity', handler);
      };
    },
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

