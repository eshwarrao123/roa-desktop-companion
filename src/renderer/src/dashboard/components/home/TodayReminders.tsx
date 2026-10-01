import React, { useEffect, useMemo } from 'react';
import { useRemindersStore } from '../../store/useRemindersStore';
import { Clock, Circle } from 'lucide-react';
import { SectionLabel } from '../ui/SectionLabel';

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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatSchedule = (reminder: any) => {
    if (reminder.schedule_type === 'interval') {
      return 'Repeating';
    }
    if (reminder.schedule_type === 'daily') {
      return 'Daily';
    }
    if (reminder.schedule_type === 'weekly') {
      return 'Weekly';
    }
    return formatTime(reminder.next_run_at);
  };

  if (todayReminders.length === 0) {
    return (
      <div className="space-y-3">
        <SectionLabel>TODAY</SectionLabel>
        <p className="text-sm text-roa-text-muted">No reminders today.</p>
        <button
          onClick={onNavigateToReminders}
          className="text-secondary text-roa-sage hover:text-roa-sage-hover transition-colors"
        >
          Create a reminder →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionLabel>TODAY</SectionLabel>
      
      <div className="space-y-px">
        {todayReminders.map((reminder, index) => (
          <div key={reminder.id}>
            {index > 0 && <div className="h-px bg-roa-border" />}
            <div className="py-4 flex items-start gap-3">
              <button
                onClick={() => toggleReminder(reminder.id, false)}
                className="mt-0.5 flex-shrink-0"
                aria-label="Complete reminder"
              >
                <Circle className="w-4 h-4 text-roa-text-muted hover:text-roa-sage transition-colors" />
              </button>
              
              <div className="flex-1 min-w-0">
                <p className="text-body-medium text-roa-text-primary">
                  {reminder.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-roa-text-muted" />
                  <span className="text-meta text-roa-text-muted">
                    {formatSchedule(reminder)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
