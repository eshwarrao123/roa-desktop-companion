import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Repeat, CalendarDays } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-roa-surface border border-roa-border rounded-roa w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-roa-border">
          <div>
            <h3 className="text-section-title-sm font-semibold text-roa-text-primary">
              {initialReminder ? 'Edit Reminder' : 'New Reminder'}
            </h3>
            <p className="text-meta text-roa-text-muted mt-0.5">
              Set up an offline reminder
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-roa-text-muted hover:text-roa-text-secondary p-1.5 rounded-roa-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-roa bg-roa-raised text-roa-clay border border-roa-clay/30 text-secondary">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-secondary font-medium text-roa-text-secondary mb-2">
              Title <span className="text-roa-clay">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Drink Water, Stretch, Stand Up"
              maxLength={128}
              className="w-full h-10 px-3 rounded-roa border border-roa-border bg-roa-raised text-body text-roa-text-primary placeholder-roa-text-muted focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-secondary font-medium text-roa-text-secondary mb-2">
              Description <span className="text-roa-text-muted font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Stay hydrated for better focus"
              maxLength={1024}
              className="w-full h-10 px-3 rounded-roa border border-roa-border bg-roa-raised text-body text-roa-text-primary placeholder-roa-text-muted focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
            />
          </div>

          {/* Schedule Type Tabs */}
          <div>
            <label className="block text-secondary font-medium text-roa-text-secondary mb-2">
              Schedule Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('interval')}
                className={`h-10 flex items-center justify-center gap-1.5 rounded-roa border text-secondary font-medium transition-colors ${
                  scheduleType === 'interval'
                    ? 'bg-roa-canvas border-roa-sage text-roa-sage'
                    : 'border-roa-border text-roa-text-muted hover:text-roa-text-secondary hover:border-roa-sage/50'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Interval
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('daily')}
                className={`h-10 flex items-center justify-center gap-1.5 rounded-roa border text-secondary font-medium transition-colors ${
                  scheduleType === 'daily'
                    ? 'bg-roa-canvas border-roa-sage text-roa-sage'
                    : 'border-roa-border text-roa-text-muted hover:text-roa-text-secondary hover:border-roa-sage/50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Daily
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('weekly')}
                className={`h-10 flex items-center justify-center gap-1.5 rounded-roa border text-secondary font-medium transition-colors ${
                  scheduleType === 'weekly'
                    ? 'bg-roa-canvas border-roa-sage text-roa-sage'
                    : 'border-roa-border text-roa-text-muted hover:text-roa-text-secondary hover:border-roa-sage/50'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Weekly
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('one_time')}
                className={`h-10 flex items-center justify-center gap-1.5 rounded-roa border text-secondary font-medium transition-colors ${
                  scheduleType === 'one_time'
                    ? 'bg-roa-canvas border-roa-sage text-roa-sage'
                    : 'border-roa-border text-roa-text-muted hover:text-roa-text-secondary hover:border-roa-sage/50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Once
              </button>
            </div>
          </div>

          {/* Dynamic Schedule Configuration */}
          <div className="p-4 rounded-roa bg-roa-raised border border-roa-border space-y-4">
            {scheduleType === 'interval' && (
              <div className="space-y-3">
                <label className="block text-secondary text-roa-text-secondary font-medium">
                  Repeat every:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setIntervalMinutes(mins)}
                      className={`h-8 px-3 rounded-roa border text-secondary font-medium transition-colors ${
                        intervalMinutes === mins
                          ? 'bg-roa-sage border-roa-sage text-roa-canvas'
                          : 'bg-roa-canvas border-roa-border text-roa-text-secondary hover:border-roa-sage'
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10080}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Math.max(1, Number(e.target.value)))}
                    className="w-24 h-8 px-3 rounded-roa border border-roa-border bg-roa-canvas text-secondary text-roa-text-primary focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
                  />
                  <span className="text-secondary text-roa-text-muted">minutes</span>
                </div>
              </div>
            )}

            {scheduleType === 'daily' && (
              <div className="space-y-2">
                <label className="block text-secondary text-roa-text-secondary font-medium">
                  At what time each day?
                </label>
                <input
                  type="time"
                  value={dailyTime}
                  onChange={(e) => setDailyTime(e.target.value)}
                  className="h-10 px-3 rounded-roa border border-roa-border bg-roa-canvas text-secondary text-roa-text-primary font-mono focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
                />
              </div>
            )}

            {scheduleType === 'weekly' && (
              <div className="space-y-3">
                <label className="block text-secondary text-roa-text-secondary font-medium">
                  Which day and time?
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setWeeklyDay(idx)}
                      className={`h-9 text-micro rounded-roa border font-semibold transition-colors ${
                        weeklyDay === idx
                          ? 'bg-roa-sage border-roa-sage text-roa-canvas'
                          : 'bg-roa-canvas border-roa-border text-roa-text-secondary hover:border-roa-sage'
                      }`}
                    >
                      {day.slice(0, 3).toUpperCase()}
                    </button>
                  ))}
                </div>
                <div>
                  <input
                    type="time"
                    value={weeklyTime}
                    onChange={(e) => setWeeklyTime(e.target.value)}
                    className="h-10 px-3 rounded-roa border border-roa-border bg-roa-canvas text-secondary text-roa-text-primary font-mono focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
                  />
                </div>
              </div>
            )}

            {scheduleType === 'one_time' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-secondary text-roa-text-secondary font-medium mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={oneTimeDate}
                    onChange={(e) => setOneTimeDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-roa border border-roa-border bg-roa-canvas text-secondary text-roa-text-primary font-mono focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-secondary text-roa-text-secondary font-medium mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={oneTimeTime}
                    onChange={(e) => setOneTimeTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-roa border border-roa-border bg-roa-canvas text-secondary text-roa-text-primary font-mono focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-roa-border">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-roa border border-roa-border bg-transparent hover:bg-roa-raised text-roa-text-secondary text-secondary font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-roa bg-roa-sage hover:bg-roa-sage-hover text-roa-canvas text-secondary font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialReminder ? 'Update Reminder' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
