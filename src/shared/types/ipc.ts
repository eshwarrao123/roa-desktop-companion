import { PetMood, PetBehavior, PetPosition, CharacterManifest, PetState } from './pet';
import { AppSettings, SettingKey } from './settings';
import {
  Reminder,
  CreateReminderInput,
  UpdateReminderInput,
  ReminderHistory,
} from './reminders';
import {
  Timer,
  CreateTimerInput,
  PomodoroPhase,
  PomodoroState,
} from './timers';
import {
  BatteryStatus,
  SystemIdleStatus,
  GlobalShortcutStatus,
} from './system';
import {
  AIStatusInfo,
  AIProviderStatus,
  AIMessage,
  AIChatResponse,
  ToolActivity,
} from './ai';

export interface PetEvent {
  type:
    | 'timerStarted'
    | 'timerCompleted'
    | 'focusStarted'
    | 'breakStarted'
    | 'focusCompleted'
    | 'lowBattery'
    | 'systemIdle'
    | 'systemActive'
    | 'aiThinking'
    | 'aiComplete';
  title: string;
  message?: string;
}

export interface ElectronRoaAPI {
  pet: {
    getPosition: () => Promise<PetPosition>;
    setPosition: (pos: PetPosition) => Promise<void>;
    setAlwaysOnTop: (flag: boolean) => Promise<void>;
    setMood: (mood: PetMood) => Promise<void>;
    setBehavior: (behavior: PetBehavior) => Promise<void>;
    setClickThrough: (enabled: boolean) => Promise<void>;
    getState: () => Promise<PetState>;
    getWorkAreaBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
    onMoodChanged: (callback: (mood: PetMood) => void) => () => void;
    onBehaviorChanged: (callback: (behavior: PetBehavior) => void) => () => void;
    onReminderFired: (callback: (reminder: Reminder) => void) => () => void;
    onTimerEvent: (callback: (event: PetEvent) => void) => () => void;
    openContextMenu: () => Promise<void>;
  };
  dashboard: {
    open: () => Promise<void>;
    close: () => Promise<void>;
  };
  character: {
    getActive: () => Promise<CharacterManifest>;
    list: () => Promise<CharacterManifest[]>;
    setActive: (id: string) => Promise<void>;
    onChanged: (callback: (character: CharacterManifest) => void) => () => void;
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
  timers: {
    list: () => Promise<Timer[]>;
    get: (id: string) => Promise<Timer | null>;
    create: (input: CreateTimerInput) => Promise<Timer>;
    start: (id: string) => Promise<Timer>;
    pause: (id: string) => Promise<Timer>;
    resume: (id: string) => Promise<Timer>;
    reset: (id: string) => Promise<Timer>;
    cancel: (id: string) => Promise<void>;
    getActive: () => Promise<Timer | null>;
    onStateChanged: (callback: (timer: Timer) => void) => () => void;
  };
  pomodoro: {
    getState: () => Promise<PomodoroState>;
    start: (phase?: PomodoroPhase) => Promise<PomodoroState>;
    pause: () => Promise<PomodoroState>;
    resume: () => Promise<PomodoroState>;
    reset: () => Promise<PomodoroState>;
    skip: () => Promise<PomodoroState>;
    onStateChanged: (callback: (state: PomodoroState) => void) => () => void;
  };
  system: {
    getBatteryStatus: () => Promise<BatteryStatus>;
    getIdleStatus: () => Promise<SystemIdleStatus>;
    getStartupStatus: () => Promise<boolean>;
    setStartupEnabled: (enabled: boolean) => Promise<boolean>;
  };
  shortcuts: {
    getStatus: () => Promise<GlobalShortcutStatus>;
  };
  ai: {
    getStatus: () => Promise<AIStatusInfo>;
    testConnection: (
      apiKey?: string
    ) => Promise<{ success: boolean; error?: string; code?: AIProviderStatus }>;
    saveCredential: (apiKey: string) => Promise<boolean>;
    removeCredential: () => Promise<boolean>;
    chat: (message: string) => Promise<AIChatResponse>;
    getMessages: () => Promise<AIMessage[]>;
    clearConversation: () => Promise<void>;
    onToolActivity: (callback: (activity: ToolActivity) => void) => () => void;
    onStatusChanged: (callback: (info: AIStatusInfo) => void) => () => void;
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
