import { PetMood, PetPosition, CharacterManifest } from './pet';
import { AppSettings, SettingKey } from './settings';

export interface ElectronRoaAPI {
  pet: {
    getPosition: () => Promise<PetPosition>;
    setPosition: (pos: PetPosition) => Promise<void>;
    setAlwaysOnTop: (flag: boolean) => Promise<void>;
    setMood: (mood: PetMood) => Promise<void>;
    onMoodChanged: (callback: (mood: PetMood) => void) => () => void;
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
