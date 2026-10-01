import React, { useEffect, useMemo } from 'react';
import { useRemindersStore } from '../../store/useRemindersStore';
import { SectionLabel } from '../ui/SectionLabel';

export const ComingUp: React.FC = () => {
  const { reminders, fetchReminders } = useRemindersStore();

  useEffect(() => {
    fetchReminders();

    const unsubscribe = window.roa?.reminders?.onReminderTriggered?.(() => {
      fetchReminders();
    });

    return () => {
      unsubscribe?.();
    };
  }, [fetchReminders]);

  const upcomingReminders = useMemo(() => {
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return reminders
      .filter((r) => r.enabled && r.next_run_at > todayEnd.getTime())
      .sort((a, b) => a.next_run_at - b.next_run_at)
      .slice(0, 3);
  }, [reminders]);

  const formatUpcomingDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const targetDate = new Date(timestamp);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }

    const daysDiff = Math.floor((targetDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (upcomingReminders.length === 0) {
    return (
      <div className="space-y-3">
        <SectionLabel>COMING UP</SectionLabel>
        <p className="text-sm text-roa-text-muted">Nothing scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionLabel>COMING UP</SectionLabel>
      <div className="space-y-px">
        {upcomingReminders.map((reminder, index) => (
          <div key={reminder.id}>
            {index > 0 && <div className="h-px bg-roa-border" />}
            <div className="py-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-roa-text-secondary flex-1">
                  {reminder.title}
                </p>
                <p className="text-xs text-roa-text-muted whitespace-nowrap">
                  {formatUpcomingDate(reminder.next_run_at)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
