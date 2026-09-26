import React, { useEffect, useMemo } from 'react';
import { useRemindersStore } from '../../store/useRemindersStore';
import { Clock, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { Reminder } from '@shared/types/reminders';

interface TodayRemindersProps {
  onNavigateToReminders: () => void;
}

export const TodayReminders: React.FC<TodayRemindersProps> = ({ onNavigateToReminders }) => {
  const { reminders, fetchReminders, toggleReminder } = useRemindersStore();

  useEffect(() => {
    fetchReminders();

    const unsubscribe = window.roa?.reminders?.onReminderTriggered?.(() => {
      fetchReminders();
    });

    return () => {
      unsubscribe?.();
    };
  }, [fetchReminders]);

  const todayReminders = useMemo(() => {
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    return reminders
      .filter((r) => r.enabled && r.next_run_at <= todayEnd.getTime())
      .sort((a, b) => a.next_run_at - b.next_run_at)
      .slice(0, 5);
  }, [reminders]);

  const upcomingReminders = useMemo(() => {
    return reminders
      .filter((r) => r.enabled)
      .sort((a, b) => a.next_run_at - b.next_run_at)
      .slice(0, 3);
  }, [reminders]);

  const activeCount = reminders.filter((r) => r.enabled).length;

  const formatNextDue = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff < 0) return 'Overdue';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const displayReminders = todayReminders.length > 0 ? todayReminders : upcomingReminders;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-roa-text-primary">Today's Reminders</h2>
          <p className="text-xs text-roa-text-muted mt-0.5">
            {activeCount} active reminder{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onNavigateToReminders}
          className="text-xs text-roa-primary-sage hover:text-roa-dark-sage font-medium transition-colors"
        >
          View All →
        </button>
      </div>

      {displayReminders.length > 0 ? (
        <div className="bg-roa-surface border border-roa-divider rounded-lg divide-y divide-roa-divider">
          {displayReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="px-4 py-3 hover:bg-roa-surface-tint/30 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleReminder(reminder.id, false)}
                  className="mt-0.5 flex-shrink-0"
                >
                  <Circle className="w-4 h-4 text-roa-text-muted hover:text-roa-primary-sage transition-colors" />
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-roa-text-secondary truncate">
                    {reminder.title}
                  </p>
                  {reminder.description && (
                    <p className="text-xs text-roa-text-muted truncate mt-0.5">
                      {reminder.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-roa-text-light-muted" />
                    <span className="text-xs text-roa-text-muted">
                      {formatTime(reminder.next_run_at)}
                    </span>
                    <span className="text-xs text-roa-text-light-muted">·</span>
                    <span className="text-xs font-medium text-roa-primary-sage">
                      {formatNextDue(reminder.next_run_at)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onNavigateToReminders}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4 text-roa-text-muted" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-roa-surface border border-roa-divider rounded-lg p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-roa-surface-tint mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-roa-primary-sage" />
          </div>
          <div>
            <p className="text-sm font-medium text-roa-text-secondary">All clear</p>
            <p className="text-xs text-roa-text-muted mt-0.5">
              No reminders scheduled for today
            </p>
          </div>
          <button
            onClick={onNavigateToReminders}
            className="text-xs text-roa-primary-sage hover:text-roa-dark-sage font-medium transition-colors"
          >
            Create a reminder
          </button>
        </div>
      )}
    </div>
  );
};
