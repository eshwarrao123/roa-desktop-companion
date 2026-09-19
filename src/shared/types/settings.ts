import { z } from 'zod';
import { PetMoodSchema, PetPositionSchema } from './pet';

export const AppSettingsSchema = z.object({
  'pet.position': PetPositionSchema.default({ x: 100, y: 100 }),
  'pet.alwaysOnTop': z.boolean().default(true),
  'pet.activeCharacterId': z.string().default('roa-cat'),
  'pet.currentMood': PetMoodSchema.default('idle'),
  'pet.visible': z.boolean().default(true),
  'app.launchAtLogin': z.boolean().default(false),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

export type SettingKey = keyof AppSettings;
