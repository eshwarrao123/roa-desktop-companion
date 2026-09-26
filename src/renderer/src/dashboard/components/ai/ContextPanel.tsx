import React, { useEffect, useState } from 'react';
import { useRemindersStore } from '../../store/useRemindersStore';
import { Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { AIStatusInfo } from '@shared/types/ai';

interface ContextPanelProps {
  statusInfo: AIStatusInfo | null;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ statusInfo }) => {
  const { reminders, fetchReminders } = useRemindersStore();
  
  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const upcomingReminders = reminders
    .filter((r) => r.enabled)
    .sort((a, b) => a.next_run_at - b.next_run_at)
    .slice(0, 3);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isConfigured = statusInfo?.isConfigured && statusInfo?.provider === 'gemini';
  const isAvailable = statusInfo?.serviceStatus === 'available';

  return (
    <div className="space-y-6">
      {/* AI Status */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-roa-structural-label">
          Assistant Status
        </h4>
        
        <div className="bg-roa-surface border border-roa-divider rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConfigured && isAvailable 
                ? 'bg-roa-primary-sage' 
                : 'bg-roa-text-light-muted'
            }`} />
            <span className="text-xs font-medium text-roa-text-secondary">
              {isConfigured && isAvailable 
                ? 'Connected' 
                : isConfigured 
                ? 'Ready' 
                : 'Not configured'}
            </span>
          </div>
          
          {isConfigured && (
            <p className="text-xs text-roa-text-muted">
              Powered by Google Gemini
            </p>
          )}
        </div>
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-roa-structural-label">
            Upcoming
          </h4>
          
          <div className="space-y-1.5">
            {upcomingReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="bg-roa-surface border border-roa-divider rounded-lg p-2.5 space-y-1"
              >
                <p className="text-xs font-medium text-roa-text-secondary truncate">
                  {reminder.title}
                </p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-roa-text-light-muted" />
                  <span className="text-xs text-roa-text-muted">
                    {formatTime(reminder.next_run_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today Context */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-roa-structural-label">
          Today
        </h4>
        
        <div className="bg-roa-surface border border-roa-divider rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-roa-primary-sage" />
            <span className="text-xs text-roa-text-muted">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
