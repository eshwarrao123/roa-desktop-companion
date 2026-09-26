import React, { useState } from 'react';
import {
  Clock,
  Repeat,
  CalendarDays,
  Calendar,
  Pencil,
  Trash2,
  AlarmClock,
  ChevronDown,
} from 'lucide-react';
import {
  Reminder,
  OneTimeScheduleData,
  IntervalScheduleData,
  DailyScheduleData,
  WeeklyScheduleData,
} from '@shared/types/reminders';

interface ReminderRowProps {
  reminder: Reminder;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ReminderRow: React.FC<ReminderRowProps> = ({
  reminder,
  onToggle,
  onEdit,
  onDelete,
  onSnooze,
}) => {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const getScheduleLabel = () => {
    switch (reminder.schedule_type) {
      case 'interval': {
        const mins = (reminder.schedule_data as IntervalScheduleData).intervalMinutes;
        return mins < 60 ? `Every ${mins}m` : `Every ${mins / 60}h`;
      }
      case 'daily': {
        const time = (reminder.schedule_data as DailyScheduleData).time;
        return `Daily at ${time}`;
      }
      case 'weekly': {
        const w = reminder.schedule_data as WeeklyScheduleData;
        return `Weekly on ${DAYS_SHORT[w.dayOfWeek]} at ${w.time}`;
      }
      case 'one_time': {
        const ts = (reminder.schedule_data as OneTimeScheduleData).targetTimestamp;
        const d = new Date(ts);
        return `Once on ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      }
      default:
        return 'Custom';
    }
  };

  const getScheduleIcon = () => {
    switch (reminder.schedule_type) {
      case 'interval':
        return <Repeat className="w-3.5 h-3.5 text-roa-primary-sage" />;
      case 'daily':
        return <Clock className="w-3.5 h-3.5 text-roa-warm-clay" />;
      case 'weekly':
        return <CalendarDays className="w-3.5 h-3.5 text-roa-primary-sage" />;
      case 'one_time':
        return <Calendar className="w-3.5 h-3.5 text-roa-text-muted" />;
    }
  };

  const formatNextRun = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const isTomorrow =
      date.getDate() === now.getDate() + 1 &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  return (
    <div
      className={`flex items-center gap-4 py-4 border-b border-roa-divider transition-opacity ${
        reminder.enabled ? 'opacity-100' : 'opacity-50'
      }`}
    >
      {/* Toggle checkbox */}
      <button
        onClick={() => onToggle(reminder.id, !reminder.enabled)}
        className="flex-shrink-0"
        title={reminder.enabled ? 'Mark as inactive' : 'Mark as active'}
      >
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            reminder.enabled
              ? 'border-roa-primary-sage bg-roa-primary-sage'
              : 'border-roa-divider hover:border-roa-primary-sage'
          }`}
        >
          {reminder.enabled && (
            <svg className="w-3 h-3 text-roa-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h4
            className={`text-sm font-medium ${
              reminder.enabled ? 'text-roa-text-primary' : 'text-roa-text-muted line-through'
            }`}
          >
            {reminder.title}
          </h4>
        </div>
        
        {reminder.description && (
          <p className="text-xs text-roa-text-muted mt-0.5 truncate">
            {reminder.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1">
          {getScheduleIcon()}
          <span className="text-xs text-roa-text-muted">
            {getScheduleLabel()}
          </span>
        </div>
      </div>

      {/* Next occurrence */}
      {reminder.enabled && (
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium text-roa-text-secondary">
            {formatNextRun(reminder.next_run_at)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Snooze */}
        {reminder.enabled && (
          <div className="relative">
            <button
              onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
              title="Snooze"
              className="p-1.5 rounded hover:bg-roa-surface-tint text-roa-text-muted hover:text-roa-text-secondary transition-colors"
            >
              <AlarmClock className="w-4 h-4" />
            </button>

            {showSnoozeMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowSnoozeMenu(false)}
                />
                <div className="absolute right-0 top-8 z-30 w-32 bg-roa-surface border border-roa-divider rounded-lg shadow-lg p-1 text-xs">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-roa-structural-label">
                    Snooze For
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {[5, 10, 15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => {
                          onSnooze(reminder.id, mins);
                          setShowSnoozeMenu(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-roa-surface-tint text-roa-text-secondary font-medium transition-colors"
                      >
                        {mins < 60 ? `${mins} minutes` : '1 hour'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Edit */}
        <button
          onClick={() => onEdit(reminder)}
          title="Edit"
          className="p-1.5 rounded hover:bg-roa-surface-tint text-roa-text-muted hover:text-roa-text-secondary transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm(`Delete reminder "${reminder.title}"?`)) {
              onDelete(reminder.id);
            }
          }}
          title="Delete"
          className="p-1.5 rounded hover:bg-roa-surface-tint text-roa-text-muted hover:text-roa-text-secondary transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
