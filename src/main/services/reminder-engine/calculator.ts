import {
  ScheduleType,
  ScheduleData,
  OneTimeScheduleData,
  IntervalScheduleData,
  DailyScheduleData,
  WeeklyScheduleData,
} from '@shared/types/reminders';

/**
 * Calculates the next run timestamp in milliseconds given a schedule type,
 * schedule configuration, and base reference timestamp.
 */
export function calculateNextRun(
  type: ScheduleType,
  data: ScheduleData,
  fromTimestamp: number = Date.now()
): number {
  switch (type) {
    case 'one_time': {
      const oneTime = data as OneTimeScheduleData;
      return oneTime.targetTimestamp;
    }

    case 'interval': {
      const interval = data as IntervalScheduleData;
      const intervalMs = interval.intervalMinutes * 60 * 1000;
      return fromTimestamp + intervalMs;
    }

    case 'daily': {
      const daily = data as DailyScheduleData;
      const [hours, minutes] = daily.time.split(':').map(Number);
      const date = new Date(fromTimestamp);

      const target = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
        0,
        0
      );

      // If the target time today is at or before fromTimestamp, advance to tomorrow
      if (target.getTime() <= fromTimestamp) {
        target.setDate(target.getDate() + 1);
      }

      return target.getTime();
    }

    case 'weekly': {
      const weekly = data as WeeklyScheduleData;
      const [hours, minutes] = weekly.time.split(':').map(Number);
      const date = new Date(fromTimestamp);
      const currentDay = date.getDay();

      let daysAhead = (weekly.dayOfWeek - currentDay + 7) % 7;

      const target = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + daysAhead,
        hours,
        minutes,
        0,
        0
      );

      // If target is today but time already passed, advance to next week (+7 days)
      if (daysAhead === 0 && target.getTime() <= fromTimestamp) {
        target.setDate(target.getDate() + 7);
      }

      return target.getTime();
    }

    default:
      throw new Error(`Unsupported schedule type: ${type}`);
  }
}

/**
 * Calculates the next valid future run time for a recurring reminder after a missed period
 * (e.g. system sleep or app closed). Ensures that nextRunAt is strictly in the future (> now).
 */
export function calculateRecoveryNextRun(
  type: ScheduleType,
  data: ScheduleData,
  now: number = Date.now()
): number {
  if (type === 'one_time') {
    // One-time reminders do not reschedule into the future
    return (data as OneTimeScheduleData).targetTimestamp;
  }

  return calculateNextRun(type, data, now);
}

/**
 * Calculates snooze timestamp for a reminder.
 */
export function calculateSnooze(minutes: number, fromTimestamp: number = Date.now()): number {
  return fromTimestamp + minutes * 60 * 1000;
}
