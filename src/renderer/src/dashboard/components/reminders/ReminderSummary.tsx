import React from 'react';
import { Reminder } from '@shared/types/reminders';

interface ReminderSummaryProps {
  reminders: Reminder[];
}

export const ReminderSummary: React.FC<ReminderSummaryProps> = ({ reminders }) => {
  const activeCount = reminders.filter((r) => r.enabled).length;
  const totalCount = reminders.length;
  
  const nextReminder = reminders
    .filter((r) => r.enabled)
    .sort((a, b) => a.next_run_at - b.next_run_at)[0];

  const formatNextTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex items-center gap-4 text-secondary">
      <div className="flex items-center gap-1.5">
        <span className="text-roa-text-muted">{activeCount} active</span>
        <span className="text-roa-text-muted">·</span>
        <span className="text-roa-text-muted">{totalCount} total</span>
      </div>
      
      {nextReminder && (
        <>
          <span className="text-roa-text-muted">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-roa-text-muted">Next:</span>
            <span className="font-medium text-roa-text-secondary">
              {formatNextTime(nextReminder.next_run_at)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
