import React, { useEffect, useState } from 'react';

interface ReminderCompletionEvent {
  id: string;
  title: string;
  description: string | null;
}

export const ReminderToast: React.FC = () => {
  const [reminders, setReminders] = useState<(ReminderCompletionEvent & { key: string })[]>([]);

  useEffect(() => {
    if (!window.roa?.reminders?.onReminderNotificationFallback) return;

    const unsubscribe = window.roa.reminders.onReminderNotificationFallback((event: ReminderCompletionEvent) => {
      const key = `${event.id}-${Date.now()}`;
      setReminders((prev) => [
        ...prev,
        {
          id: event.id,
          title: event.title,
          description: event.description,
          key,
        },
      ]);

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setReminders((prev) => prev.filter((r) => r.key !== key));
      }, 8000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismiss = (key: string) => {
    setReminders((prev) => prev.filter((r) => r.key !== key));
  };

  if (reminders.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {reminders.map((reminder) => {
        return (
          <div
            key={reminder.key}
            className="pointer-events-auto bg-roa-surface border border-roa-border rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px] animate-slide-in-right"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-roa-text-primary mb-1">
                  🔔 ROA Reminder
                </p>
                <p className="text-sm text-roa-text-primary font-medium mb-1">{reminder.title}</p>
                {reminder.description && (
                  <p className="text-xs text-roa-text-secondary">{reminder.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDismiss(reminder.key)}
                className="text-roa-text-muted hover:text-roa-text-primary transition-colors flex-shrink-0 text-lg leading-none"
                aria-label="Dismiss reminder"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
