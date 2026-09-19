import {
  CreateReminderToolSchema,
  ListRemindersToolSchema,
  UpdateReminderToolSchema,
  DeleteReminderToolSchema,
  SnoozeReminderToolSchema,
  StartTimerToolSchema,
  StopTimerToolSchema,
  GetCurrentTimeToolSchema,
  GetBatteryStatusToolSchema,
  GetTodaySummaryToolSchema,
} from '@shared/types/ai';
import { ToolRegistry } from './registry';

export function registerDefaultTools(registry: ToolRegistry): void {
  // 1. create_reminder
  registry.register({
    name: 'create_reminder',
    description:
      'Creates a desktop reminder. schedule_type must be "one_time", "interval", "daily", or "weekly". schedule_data represents time/frequency (e.g. ISO string for one_time, "30m" for interval, "14:00" for daily).',
    schema: CreateReminderToolSchema,
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title or short summary of what to remind about' },
        schedule_type: {
          type: 'string',
          enum: ['one_time', 'interval', 'daily', 'weekly'],
          description: 'Type of schedule',
        },
        schedule_data: {
          type: 'string',
          description: 'Schedule detail (ISO date-time for one_time, duration like "30m" or "2h" for interval, "HH:MM" for daily)',
        },
        description: { type: 'string', description: 'Optional longer description' },
      },
      required: ['title', 'schedule_type', 'schedule_data'],
    },
    execute: async (args, context) => {
      const created = context.reminderEngine.create({
        title: args.title,
        schedule_type: args.schedule_type || 'one_time',
        schedule_data: args.schedule_data,
        description: args.description,
        enabled: true,
        timezone: 'local',
      });
      return {
        success: true,
        message: `Reminder "${created.title}" created successfully for ${new Date(created.next_run_at).toLocaleString()}.`,
        reminder: created,
      };
    },
  });

  // 2. list_reminders
  registry.register({
    name: 'list_reminders',
    description: 'Lists existing desktop reminders, optionally filtered by enabled status.',
    schema: ListRemindersToolSchema,
    parameters: {
      type: 'object',
      properties: {
        enabled_only: { type: 'boolean', description: 'If true, only returns active/enabled reminders' },
        limit: { type: 'number', description: 'Max reminders to return (default 20)' },
      },
    },
    execute: async (args, context) => {
      let reminders = context.reminderEngine.list();
      if (args.enabled_only) {
        reminders = reminders.filter((r) => r.enabled);
      }
      const slice = reminders.slice(0, args.limit || 20);
      return {
        count: slice.length,
        total: reminders.length,
        reminders: slice.map((r) => ({
          id: r.id,
          title: r.title,
          schedule_type: r.schedule_type,
          schedule_data: r.schedule_data,
          enabled: r.enabled,
          next_run_at: new Date(r.next_run_at).toLocaleString(),
        })),
      };
    },
  });

  // 3. update_reminder
  registry.register({
    name: 'update_reminder',
    description: 'Updates an existing reminder by ID (e.g. changing title or enabling/disabling).',
    schema: UpdateReminderToolSchema,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the reminder to update' },
        title: { type: 'string', description: 'New title' },
        enabled: { type: 'boolean', description: 'Whether the reminder is enabled' },
      },
      required: ['id'],
    },
    execute: async (args, context) => {
      const updated = context.reminderEngine.update(args.id, {
        title: args.title,
        enabled: args.enabled,
      });
      return {
        success: true,
        reminder: updated,
      };
    },
  });

  // 4. delete_reminder
  registry.register({
    name: 'delete_reminder',
    description: 'Deletes a reminder by ID.',
    schema: DeleteReminderToolSchema,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the reminder to delete' },
      },
      required: ['id'],
    },
    execute: async (args, context) => {
      context.reminderEngine.delete(args.id);
      return {
        success: true,
        message: `Reminder ${args.id} deleted successfully.`,
      };
    },
  });

  // 5. snooze_reminder
  registry.register({
    name: 'snooze_reminder',
    description: 'Snoozes an existing reminder for a specified number of minutes (default 10).',
    schema: SnoozeReminderToolSchema,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the reminder to snooze' },
        minutes: { type: 'number', description: 'Minutes to snooze for (default 10)' },
      },
      required: ['id'],
    },
    execute: async (args, context) => {
      context.reminderEngine.snooze(args.id, args.minutes || 10);
      return {
        success: true,
        message: `Reminder ${args.id} snoozed for ${args.minutes || 10} minutes.`,
      };
    },
  });

  // 6. start_timer
  registry.register({
    name: 'start_timer',
    description:
      'Starts a countdown timer or a Pomodoro focus session. If is_pomodoro is true, starts a Pomodoro session.',
    schema: StartTimerToolSchema,
    parameters: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Label for the timer (e.g. "Study", "Focus", "Tea")' },
        duration_minutes: { type: 'number', description: 'Duration in minutes (e.g. 25, 45, 10)' },
        is_pomodoro: { type: 'boolean', description: 'Whether this is a Pomodoro focus session' },
      },
      required: ['label'],
    },
    execute: async (args, context) => {
      if (args.is_pomodoro) {
        const state = context.timerEngine.startPomodoro('focus');
        return {
          success: true,
          mode: 'pomodoro',
          phase: state.phase,
          remaining_seconds: state.activeTimer
            ? Math.round(state.activeTimer.remaining_ms / 1000)
            : 1500,
          message: 'Pomodoro focus session started!',
        };
      }

      const durationMs = (args.duration_minutes || 25) * 60 * 1000;
      const timer = context.timerEngine.createTimer({
        label: args.label || 'Timer',
        duration_ms: durationMs,
        type: 'countdown',
      });
      const started = context.timerEngine.startTimer(timer.id);
      return {
        success: true,
        mode: 'countdown',
        id: started.id,
        label: started.label,
        duration_minutes: args.duration_minutes,
        ends_at: started.ends_at ? new Date(started.ends_at).toLocaleTimeString() : null,
        message: `Timer "${started.label}" started for ${args.duration_minutes} minutes.`,
      };
    },
  });

  // 7. stop_timer
  registry.register({
    name: 'stop_timer',
    description: 'Pauses or cancels an active countdown timer or Pomodoro session.',
    schema: StopTimerToolSchema,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Optional specific timer ID to pause/cancel' },
        action: { type: 'string', enum: ['pause', 'cancel'], description: 'Action to perform ("pause" or "cancel")' },
      },
      required: ['action'],
    },
    execute: async (args, context) => {
      const active = context.timerEngine.getActiveTimer();
      const pomodoro = context.timerEngine.getPomodoroState();

      if (pomodoro.activeTimer && pomodoro.activeTimer.state === 'running') {
        if (args.action === 'pause') {
          context.timerEngine.pausePomodoro();
          return { success: true, message: 'Pomodoro session paused.' };
        } else {
          context.timerEngine.resetPomodoro();
          return { success: true, message: 'Pomodoro session cancelled.' };
        }
      }

      if (active) {
        if (args.action === 'pause') {
          const paused = context.timerEngine.pauseTimer(active.id);
          return { success: true, message: `Timer "${paused.label}" paused.` };
        } else {
          context.timerEngine.cancelTimer(active.id);
          return { success: true, message: `Timer "${active.label}" cancelled.` };
        }
      }

      return { success: false, message: 'No active timer or Pomodoro session to stop.' };
    },
  });

  // 8. get_current_time
  registry.register({
    name: 'get_current_time',
    description: 'Returns the current local system date, time, and timezone.',
    schema: GetCurrentTimeToolSchema,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      const now = new Date();
      return {
        iso: now.toISOString(),
        local_date: now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        local_time: now.toLocaleTimeString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp_ms: now.getTime(),
      };
    },
  });

  // 9. get_battery_status
  registry.register({
    name: 'get_battery_status',
    description: 'Retrieves current laptop battery percentage, AC power status, and charging state.',
    schema: GetBatteryStatusToolSchema,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_args, context) => {
      const status = await context.systemService.getBatteryStatus();
      return {
        is_battery_present: status.percent !== null,
        is_on_battery_power: status.isOnBattery,
        battery_percentage: status.percent,
        is_charging: status.isCharging,
      };
    },
  });

  // 10. get_today_summary
  registry.register({
    name: 'get_today_summary',
    description: 'Gives a comprehensive local summary of today: active reminders, active timers/Pomodoro, pet mood, and battery.',
    schema: GetTodaySummaryToolSchema,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_args, context) => {
      const now = new Date();
      const reminders = context.reminderEngine.list().filter((r) => r.enabled);
      const activeTimer = context.timerEngine.getActiveTimer();
      const pomodoro = context.timerEngine.getPomodoroState();
      const battery = await context.systemService.getBatteryStatus();
      const activeChar = context.characterRegistry.getActive();
      const mood = context.settingsStore.get('pet.currentMood');

      return {
        date: now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
        active_reminders_count: reminders.length,
        upcoming_reminders: reminders.slice(0, 5).map((r) => ({
          title: r.title,
          next_run: new Date(r.next_run_at).toLocaleTimeString(),
        })),
        timer: activeTimer
          ? { label: activeTimer.label, state: activeTimer.state, remaining_seconds: Math.round(activeTimer.remaining_ms / 1000) }
          : null,
        pomodoro: pomodoro.activeTimer
          ? {
              phase: pomodoro.phase,
              completed_cycles: pomodoro.completedCycles,
              remaining_seconds: Math.round(pomodoro.activeTimer.remaining_ms / 1000),
            }
          : null,
        battery:
          battery.percent !== null
            ? { percent: battery.percent, on_battery: battery.isOnBattery, is_charging: battery.isCharging }
            : 'AC / Desktop',
        pet: {
          character: activeChar?.name || 'ROA',
          mood,
        },
      };
    },
  });
}
