import React, { useState } from 'react';
import {
  Clock,
  Repeat,
  CalendarDays,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  AlarmClock,
} from 'lucide-react';
import {
  Reminder,
  OneTimeScheduleData,
  IntervalScheduleData,
  DailyScheduleData,
  WeeklyScheduleData,
} from '@shared/types/reminders';

interface ReminderItemProps {
  reminder: Reminder;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ReminderItem: React.FC<ReminderItemProps> = ({
  reminder,
  onToggle,
  onEdit,
  onDelete,
  onSnooze,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  // Format schedule text
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
        return `Once on ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      default:
        return 'Custom';
    }
  };

  const getScheduleIcon = () => {
    switch (reminder.schedule_type) {
      case 'interval':
        return <Repeat className="w-3.5 h-3.5 text-indigo-500" />;
      case 'daily':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'weekly':
        return <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />;
      case 'one_time':
        return <Calendar className="w-3.5 h-3.5 text-violet-500" />;
    }
  };

  // Format next run text
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

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Today at ${timeStr}`;
    }
    if (isTomorrow) {
      return `Tomorrow at ${timeStr}`;
    }
    return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${timeStr}`;
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        reminder.enabled
          ? 'bg-white dark:bg-[#252542] border-zinc-200 dark:border-[#3D3D6B] shadow-sm'
          : 'bg-zinc-50/70 dark:bg-[#1E1E38]/60 border-zinc-200/60 dark:border-zinc-800/80 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Main Details */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={`text-sm font-semibold truncate ${
                reminder.enabled ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 line-through'
              }`}
            >
              {reminder.title}
            </h4>
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#1E1E38] border border-zinc-200/80 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
              {getScheduleIcon()}
              {getScheduleLabel()}
            </span>
          </div>

          {reminder.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
              {reminder.description}
            </p>
          )}

          {/* Next Run & Status */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 pt-1">
            {reminder.enabled ? (
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                <Clock className="w-3 h-3" />
                Next: {formatNextRun(reminder.next_run_at)}
              </span>
            ) : (
              <span className="text-zinc-400">Inactive / Completed</span>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 relative">
          {/* Snooze button (if enabled) */}
          {reminder.enabled && (
            <div className="relative">
              <button
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                title="Snooze reminder"
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#2D2D4E] text-zinc-600 dark:text-zinc-400 transition-colors"
              >
                <AlarmClock className="w-3.5 h-3.5" />
              </button>

              {showSnoozeMenu && (
                <div className="absolute right-0 top-8 z-30 w-32 bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl shadow-lg p-1 text-xs divide-y divide-zinc-100 dark:divide-zinc-800 animate-in fade-in">
                  <div className="px-2 py-1 text-[10px] uppercase font-mono text-zinc-400 font-semibold">
                    Snooze For
                  </div>
                  <div className="pt-1 space-y-0.5">
                    {[5, 10, 15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => {
                          onSnooze(reminder.id, mins);
                          setShowSnoozeMenu(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 font-medium"
                      >
                        {mins < 60 ? `${mins} minutes` : '1 hour'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toggle Active switch */}
          <button
            onClick={() => onToggle(reminder.id, !reminder.enabled)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
              reminder.enabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
            title={reminder.enabled ? 'Click to disable' : 'Click to enable'}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${
                reminder.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#2D2D4E] transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-30 w-28 bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl shadow-lg p-1 text-xs space-y-0.5 animate-in fade-in">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(reminder);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-[#2D2D4E] text-zinc-700 dark:text-zinc-300 font-medium text-left"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm(`Delete reminder "${reminder.title}"?`)) {
                      onDelete(reminder.id);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium text-left"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
