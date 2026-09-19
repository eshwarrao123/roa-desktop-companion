import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Repeat, CalendarDays, Sparkles } from 'lucide-react';
import {
  Reminder,
  CreateReminderInput,
  ScheduleType,
  OneTimeScheduleData,
  IntervalScheduleData,
  DailyScheduleData,
  WeeklyScheduleData,
} from '@shared/types/reminders';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateReminderInput) => Promise<void>;
  initialReminder?: Reminder | null;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialReminder,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('interval');

  // One-time states
  const [oneTimeDate, setOneTimeDate] = useState('');
  const [oneTimeTime, setOneTimeTime] = useState('09:00');

  // Interval states
  const [intervalMinutes, setIntervalMinutes] = useState(30);

  // Daily states
  const [dailyTime, setDailyTime] = useState('09:00');

  // Weekly states
  const [weeklyDay, setWeeklyDay] = useState(1); // Monday
  const [weeklyTime, setWeeklyTime] = useState('10:00');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialReminder) {
      setTitle(initialReminder.title);
      setDescription(initialReminder.description ?? '');
      setScheduleType(initialReminder.schedule_type);

      if (initialReminder.schedule_type === 'one_time') {
        const d = new Date((initialReminder.schedule_data as OneTimeScheduleData).targetTimestamp);
        setOneTimeDate(d.toISOString().slice(0, 10));
        setOneTimeTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      } else if (initialReminder.schedule_type === 'interval') {
        setIntervalMinutes((initialReminder.schedule_data as IntervalScheduleData).intervalMinutes);
      } else if (initialReminder.schedule_type === 'daily') {
        setDailyTime((initialReminder.schedule_data as DailyScheduleData).time);
      } else if (initialReminder.schedule_type === 'weekly') {
        const w = initialReminder.schedule_data as WeeklyScheduleData;
        setWeeklyDay(w.dayOfWeek);
        setWeeklyTime(w.time);
      }
    } else {
      // Defaults for new reminder
      setTitle('');
      setDescription('');
      setScheduleType('interval');
      setIntervalMinutes(30);

      const tomorrow = new Date(Date.now() + 86400000);
      setOneTimeDate(tomorrow.toISOString().slice(0, 10));
      setOneTimeTime('09:00');
      setDailyTime('09:00');
      setWeeklyDay(1);
      setWeeklyTime('10:00');
    }
    setError(null);
  }, [initialReminder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a reminder title.');
      return;
    }

    let scheduleData: unknown;

    if (scheduleType === 'one_time') {
      if (!oneTimeDate || !oneTimeTime) {
        setError('Please select both date and time for one-time reminder.');
        return;
      }
      const [hours, minutes] = oneTimeTime.split(':').map(Number);
      const targetDate = new Date(`${oneTimeDate}T00:00:00`);
      targetDate.setHours(hours, minutes, 0, 0);

      if (targetDate.getTime() <= Date.now()) {
        setError('Scheduled date & time must be in the future.');
        return;
      }
      scheduleData = { targetTimestamp: targetDate.getTime() };
    } else if (scheduleType === 'interval') {
      if (intervalMinutes <= 0 || isNaN(intervalMinutes)) {
        setError('Interval must be at least 1 minute.');
        return;
      }
      scheduleData = { intervalMinutes: Number(intervalMinutes) };
    } else if (scheduleType === 'daily') {
      if (!dailyTime) {
        setError('Please set the daily reminder time.');
        return;
      }
      scheduleData = { time: dailyTime };
    } else if (scheduleType === 'weekly') {
      if (!weeklyTime) {
        setError('Please set the weekly reminder time.');
        return;
      }
      scheduleData = { dayOfWeek: Number(weeklyDay), time: weeklyTime };
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        schedule_type: scheduleType,
        schedule_data: scheduleData,
        timezone: 'local',
        enabled: true,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save reminder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                {initialReminder ? 'Edit Reminder' : 'Create Local Reminder'}
              </h3>
              <p className="text-[11px] text-zinc-500">Scheduled offline with local SQLite engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Drink Water, Stretch, Stand Up"
              maxLength={128}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#1E1E38] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Stay hydrated for better focus"
              maxLength={1024}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#1E1E38] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Schedule Type Tabs */}
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Schedule Type
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-100 dark:bg-[#1E1E38] rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setScheduleType('interval')}
                className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  scheduleType === 'interval'
                    ? 'bg-white dark:bg-[#252542] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <Repeat className="w-3 h-3" />
                Interval
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('daily')}
                className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  scheduleType === 'daily'
                    ? 'bg-white dark:bg-[#252542] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <Clock className="w-3 h-3" />
                Daily
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('weekly')}
                className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  scheduleType === 'weekly'
                    ? 'bg-white dark:bg-[#252542] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <CalendarDays className="w-3 h-3" />
                Weekly
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('one_time')}
                className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  scheduleType === 'one_time'
                    ? 'bg-white dark:bg-[#252542] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <Calendar className="w-3 h-3" />
                One-Time
              </button>
            </div>
          </div>

          {/* Dynamic Schedule Configuration */}
          <div className="p-4 rounded-xl bg-zinc-50/80 dark:bg-[#1E1E38]/60 border border-zinc-200/60 dark:border-zinc-800 space-y-3">
            {scheduleType === 'interval' && (
              <div className="space-y-3">
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium">
                  Repeat every:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setIntervalMinutes(mins)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        intervalMinutes === mins
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-[#252542] border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={10080}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Math.max(1, Number(e.target.value)))}
                    className="w-24 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] text-xs"
                  />
                  <span className="text-zinc-500">minutes</span>
                </div>
              </div>
            )}

            {scheduleType === 'daily' && (
              <div className="space-y-2">
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium">
                  At what time each day?
                </label>
                <input
                  type="time"
                  value={dailyTime}
                  onChange={(e) => setDailyTime(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] text-xs font-mono"
                />
              </div>
            )}

            {scheduleType === 'weekly' && (
              <div className="space-y-3">
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium">
                  Which day and time?
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setWeeklyDay(idx)}
                      className={`py-1.5 text-[11px] rounded-lg border font-medium transition-colors ${
                        weeklyDay === idx
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-[#252542] border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <div className="pt-1">
                  <input
                    type="time"
                    value={weeklyTime}
                    onChange={(e) => setWeeklyTime(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {scheduleType === 'one_time' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={oneTimeDate}
                    onChange={(e) => setOneTimeDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={oneTimeTime}
                    onChange={(e) => setOneTimeTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium text-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialReminder ? 'Update Reminder' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
