import React, { useEffect, useState } from 'react';
import { useRemindersStore } from '../../store/useRemindersStore';
import { Timer } from '@shared/types/timers';
import { SectionLabel } from '../ui/SectionLabel';
import { StatusPip } from '../ui/StatusPip';
import { AIStatusInfo } from '@shared/types/ai';

interface ContextPanelProps {
  statusInfo: AIStatusInfo | null;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ statusInfo }) => {
  const { reminders, fetchReminders } = useRemindersStore();
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  
  useEffect(() => {
    fetchReminders();

    if (window.roa?.timers) {
      window.roa.timers.getActive().then(setActiveTimer).catch(console.error);

      const unsubTimer = window.roa.timers.onStateChanged((timer) => {
        setActiveTimer(timer);
      });

      return () => {
        unsubTimer();
      };
    }
    return undefined;
  }, [fetchReminders]);

  const nextReminder = reminders
    .filter((r) => r.enabled)
    .sort((a, b) => a.next_run_at - b.next_run_at)[0];

  const activeCount = reminders.filter((r) => r.enabled).length;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatTimerTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isConfigured = statusInfo?.isConfigured && statusInfo?.provider === 'gemini';
  const isAvailable = statusInfo?.serviceStatus === 'available';

  return (
    <div className="space-y-6">
      <SectionLabel>TODAY</SectionLabel>
      
      <div className="space-y-4">
        {/* Date */}
        <div>
          <p className="text-xs text-roa-text-muted">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Focus Status */}
        {activeTimer && (
          <div className="pt-4 border-t border-roa-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-roa-text-muted mb-2">
              FOCUS
            </p>
            <p className="text-sm font-medium text-roa-text-secondary">
              {activeTimer.label}
            </p>
            <p className="text-xs text-roa-text-muted mt-1">
              {formatTimerTime(Math.ceil(activeTimer.remaining_ms / 1000))} remaining
            </p>
          </div>
        )}

        {/* Reminders */}
        <div className="pt-4 border-t border-roa-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-roa-text-muted mb-2">
            REMINDERS
          </p>
          <p className="text-sm text-roa-text-secondary">
            {activeCount} active
          </p>
        </div>

        {/* Next Reminder */}
        {nextReminder && (
          <div className="pt-4 border-t border-roa-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-roa-text-muted mb-2">
              NEXT
            </p>
            <p className="text-sm font-medium text-roa-text-secondary">
              {nextReminder.title}
            </p>
            <p className="text-xs text-roa-text-muted mt-1">
              {formatTime(nextReminder.next_run_at)}
            </p>
          </div>
        )}

        {/* AI Status */}
        <div className="pt-4 border-t border-roa-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-roa-text-muted mb-2">
            AI
          </p>
          <StatusPip
            color={isConfigured && isAvailable ? 'sage' : 'gray'}
            size="sm"
            label={isConfigured && isAvailable ? 'Connected' : isConfigured ? 'Ready' : 'Not configured'}
          />
        </div>
      </div>
    </div>
  );
};
