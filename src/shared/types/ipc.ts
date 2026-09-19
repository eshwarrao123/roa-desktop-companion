import { PetMood, PetPosition, CharacterManifest } from './pet';
import { AppSettings, SettingKey } from './settings';
import {
  Reminder,
  CreateReminderInput,
  UpdateReminderInput,
  ReminderHistory,
} from './reminders';

export interface ElectronRoaAPI {
  pet: {
    getPosition: () => Promise<PetPosition>;
    setPosition: (pos: PetPosition) => Promise<void>;
    setAlwaysOnTop: (flag: boolean) => Promise<void>;
    setMood: (mood: PetMood) => Promise<void>;
    onMoodChanged: (callback: (mood: PetMood) => void) => () => void;
    onReminderFired: (callback: (reminder: Reminder) => void) => () => void;
    openContextMenu: () => Promise<void>;
  };
  dashboard: {
    open: () => Promise<void>;
    close: () => Promise<void>;
  };
  character: {
    getActive: () => Promise<CharacterManifest>;
    list: () => Promise<CharacterManifest[]>;
  };
  reminders: {
    list: () => Promise<Reminder[]>;
    get: (id: string) => Promise<Reminder | null>;
    create: (input: CreateReminderInput) => Promise<Reminder>;
    update: (id: string, input: UpdateReminderInput) => Promise<Reminder>;
    delete: (id: string) => Promise<void>;
    enable: (id: string) => Promise<void>;
    disable: (id: string) => Promise<void>;
    snooze: (id: string, minutes: number) => Promise<void>;
    getHistory: (reminderId: string, limit?: number) => Promise<ReminderHistory[]>;
    onReminderTriggered: (callback: (reminder: Reminder) => void) => () => void;
  };
  settings: {
    get: <K extends SettingKey>(key: K) => Promise<AppSettings[K]>;
    getAll: () => Promise<AppSettings>;
    set: <K extends SettingKey>(key: K, value: AppSettings[K]) => Promise<void>;
    onChanged: (callback: (settings: Partial<AppSettings>) => void) => () => void;
  };
  app: {
    quit: () => Promise<void>;
    getVersion: () => Promise<string>;
    showPet: () => Promise<void>;
    hidePet: () => Promise<void>;
    resetPetPosition: () => Promise<void>;
  };
}

declare global {
  interface Window {
    roa: ElectronRoaAPI;
  }
}
