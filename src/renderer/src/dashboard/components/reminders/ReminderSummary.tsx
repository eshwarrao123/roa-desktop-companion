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
    <div className="flex items-center gap-6 text-sm">
      <div>
        <span className="text-roa-text-muted">Active</span>
        <span className="ml-2 font-semibold text-roa-primary-sage">{activeCount}</span>
      </div>
      
      <div>
        <span className="text-roa-text-muted">Total</span>
        <span className="ml-2 font-semibold text-roa-text-primary">{totalCount}</span>
      </div>
      
      {nextReminder && (
        <div>
          <span className="text-roa-text-muted">Coming up</span>
          <span className="ml-2 font-semibold text-roa-text-primary">
            {formatNextTime(nextReminder.next_run_at)}
          </span>
        </div>
      )}
    </div>
  );
};
