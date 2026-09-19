import { z } from 'zod';
import { PetMoodSchema, PetPositionSchema } from './pet';

export const AppSettingsSchema = z.object({
  'pet.position': PetPositionSchema.default({ x: 100, y: 100 }),
  'pet.alwaysOnTop': z.boolean().default(true),
  'pet.activeCharacterId': z.string().default('roa-cat'),
  'pet.currentMood': PetMoodSchema.default('idle'),
  'pet.visible': z.boolean().default(true),
  'pet.clickThrough': z.boolean().default(false),
  'app.launchAtLogin': z.boolean().default(false),
  'app.startWithWindows': z.boolean().default(false),
  'system.lowBatteryNotification': z.boolean().default(true),
  'system.lowBatteryThreshold': z.number().int().min(5).max(50).default(20),
  'system.idleReaction': z.boolean().default(false),
  'system.idleThresholdSeconds': z.number().int().min(30).max(3600).default(300),
  'pomodoro.focusDurationMinutes': z.number().int().min(1).max(120).default(25),
  'pomodoro.shortBreakMinutes': z.number().int().min(1).max(60).default(5),
  'pomodoro.longBreakMinutes': z.number().int().min(1).max(60).default(15),
  'pomodoro.longBreakInterval': z.number().int().min(1).max(12).default(4),
  'ai.provider': z.enum(['disabled', 'gemini']).default('disabled'),
  'ai.model': z.string().default('gemini-3.8-flash'),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

export type SettingKey = keyof AppSettings;
