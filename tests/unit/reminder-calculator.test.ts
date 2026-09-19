import { describe, it, expect } from 'vitest';
import {
  calculateNextRun,
  calculateRecoveryNextRun,
  calculateSnooze,
} from '../../src/main/services/reminder-engine/calculator';

describe('Reminder Engine Calculator', () => {
  describe('ONE_TIME schedule', () => {
    it('returns the exact targetTimestamp', () => {
      const target = Date.now() + 3600000; // 1 hour later
      const nextRun = calculateNextRun('one_time', { targetTimestamp: target });
      expect(nextRun).toBe(target);
    });
  });

  describe('INTERVAL schedule', () => {
    it('calculates next run by adding interval minutes to base timestamp', () => {
      const base = 1700000000000;
      const nextRun = calculateNextRun('interval', { intervalMinutes: 30 }, base);
      expect(nextRun).toBe(base + 30 * 60 * 1000);
    });

    it('handles multi-hour intervals', () => {
      const base = 1700000000000;
      const nextRun = calculateNextRun('interval', { intervalMinutes: 120 }, base);
      expect(nextRun).toBe(base + 120 * 60 * 1000);
    });
  });

  describe('DAILY schedule', () => {
    it('schedules for today if target time is in the future', () => {
      // 08:00 AM on 2026-05-10
      const baseDate = new Date(2026, 4, 10, 8, 0, 0, 0);
      const nextRun = calculateNextRun('daily', { time: '09:30' }, baseDate.getTime());

      const nextDate = new Date(nextRun);
      expect(nextDate.getFullYear()).toBe(2026);
      expect(nextDate.getMonth()).toBe(4);
      expect(nextDate.getDate()).toBe(10); // Same day
      expect(nextDate.getHours()).toBe(9);
      expect(nextDate.getMinutes()).toBe(30);
    });

    it('schedules for tomorrow if target time has already passed today', () => {
      // 10:00 AM on 2026-05-10
      const baseDate = new Date(2026, 4, 10, 10, 0, 0, 0);
      const nextRun = calculateNextRun('daily', { time: '09:30' }, baseDate.getTime());

      const nextDate = new Date(nextRun);
      expect(nextDate.getFullYear()).toBe(2026);
      expect(nextDate.getMonth()).toBe(4);
      expect(nextDate.getDate()).toBe(11); // Next day
      expect(nextDate.getHours()).toBe(9);
      expect(nextDate.getMinutes()).toBe(30);
    });
  });

  describe('WEEKLY schedule', () => {
    it('schedules for the target day of the week in the future', () => {
      // Sunday, 2026-05-10 at 08:00 AM (Day 0)
      const baseDate = new Date(2026, 4, 10, 8, 0, 0, 0);
      expect(baseDate.getDay()).toBe(0);

      // Target: Wednesday (Day 3) at 14:00
      const nextRun = calculateNextRun(
        'weekly',
        { dayOfWeek: 3, time: '14:00' },
        baseDate.getTime()
      );

      const nextDate = new Date(nextRun);
      expect(nextDate.getDay()).toBe(3);
      expect(nextDate.getDate()).toBe(13); // May 13
      expect(nextDate.getHours()).toBe(14);
      expect(nextDate.getMinutes()).toBe(0);
    });

    it('schedules for next week (+7 days) if target day is today but time already passed', () => {
      // Wednesday, 2026-05-13 at 15:00 (Day 3)
      const baseDate = new Date(2026, 4, 13, 15, 0, 0, 0);
      expect(baseDate.getDay()).toBe(3);

      // Target: Wednesday (Day 3) at 14:00 (1 hour ago)
      const nextRun = calculateNextRun(
        'weekly',
        { dayOfWeek: 3, time: '14:00' },
        baseDate.getTime()
      );

      const nextDate = new Date(nextRun);
      expect(nextDate.getDay()).toBe(3);
      expect(nextDate.getDate()).toBe(20); // May 20 (+7 days)
      expect(nextDate.getHours()).toBe(14);
      expect(nextDate.getMinutes()).toBe(0);
    });
  });

  describe('Snooze calculation', () => {
    it('adds requested minutes to base timestamp', () => {
      const base = 1700000000000;
      const snoozed = calculateSnooze(10, base);
      expect(snoozed).toBe(base + 10 * 60 * 1000);
    });
  });

  describe('Missed reminder recovery calculation', () => {
    it('calculates recovery for interval strictly in the future from now', () => {
      const now = 1700000000000;
      const recovery = calculateRecoveryNextRun('interval', { intervalMinutes: 15 }, now);
      expect(recovery).toBe(now + 15 * 60 * 1000);
      expect(recovery).toBeGreaterThan(now);
    });

    it('preserves one-time reminder timestamp during recovery check', () => {
      const target = 1699999000000;
      const recovery = calculateRecoveryNextRun('one_time', { targetTimestamp: target }, 1700000000000);
      expect(recovery).toBe(target);
    });
  });
});
