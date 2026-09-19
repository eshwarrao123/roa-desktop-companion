import { z } from 'zod';

export const TimerTypeSchema = z.enum(['countdown', 'pomodoro']);
export type TimerType = z.infer<typeof TimerTypeSchema>;

export const TimerStateSchema = z.enum(['idle', 'running', 'paused', 'completed', 'cancelled']);
export type TimerState = z.infer<typeof TimerStateSchema>;

export const PomodoroPhaseSchema = z.enum(['focus', 'short_break', 'long_break']);
export type PomodoroPhase = z.infer<typeof PomodoroPhaseSchema>;

export const TimerSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(128),
  type: TimerTypeSchema,
  duration_ms: z.number().int().positive(),
  started_at: z.number().int().positive().nullable(),
  ends_at: z.number().int().positive().nullable(),
  remaining_ms: z.number().int().nonnegative(),
  state: TimerStateSchema,
  pomodoro_phase: PomodoroPhaseSchema.optional(),
  pomodoro_cycle: z.number().int().nonnegative().optional(),
  created_at: z.number().int().positive(),
  updated_at: z.number().int().positive(),
});
export type Timer = z.infer<typeof TimerSchema>;

export const CreateTimerInputSchema = z.object({
  label: z.string().min(1).max(128),
  duration_ms: z.number().int().positive(),
  type: TimerTypeSchema.default('countdown'),
});
export type CreateTimerInput = z.infer<typeof CreateTimerInputSchema>;

export const PomodoroStateSchema = z.object({
  activeTimer: TimerSchema.nullable(),
  phase: PomodoroPhaseSchema,
  completedCycles: z.number().int().nonnegative(),
  focusDurationMinutes: z.number().int().positive(),
  shortBreakMinutes: z.number().int().positive(),
  longBreakMinutes: z.number().int().positive(),
  longBreakInterval: z.number().int().positive(),
});
export type PomodoroState = z.infer<typeof PomodoroStateSchema>;
