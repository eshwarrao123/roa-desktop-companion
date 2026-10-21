import React, { useEffect, useState } from 'react';

interface TimerCompletionEvent {
  id: string;
  label: string;
  type: string;
  phase?: string;
}

export const TimerToast: React.FC = () => {
  const [completions, setCompletions] = useState<(TimerCompletionEvent & { key: string })[]>([]);

  useEffect(() => {
    if (!window.roa?.timers?.onCompleted) return;

    const unsubscribe = window.roa.timers.onCompleted((event: TimerCompletionEvent) => {
      const key = `${event.id}-${Date.now()}`;
      setCompletions((prev) => [...prev, { ...event, key }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setCompletions((prev) => prev.filter((c) => c.key !== key));
      }, 5000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismiss = (key: string) => {
    setCompletions((prev) => prev.filter((c) => c.key !== key));
  };

  const getCompletionMessage = (completion: TimerCompletionEvent) => {
    if (completion.type === 'pomodoro') {
      if (completion.phase === 'focus') {
        return { title: 'Focus Session Complete! 🍅', body: 'Great work! Take a break.' };
      } else {
        return { title: 'Break Ended! ☕', body: 'Ready to focus again?' };
      }
    }
    return { title: 'Timer Complete!', body: `${completion.label} has finished!` };
  };

  if (completions.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {completions.map((completion) => {
        const { title, body } = getCompletionMessage(completion);
        return (
          <div
            key={completion.key}
            className="pointer-events-auto bg-roa-surface border border-roa-border rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px] animate-slide-in-right"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-roa-text-primary mb-1">{title}</p>
                <p className="text-xs text-roa-text-secondary">{body}</p>
              </div>
              <button
                onClick={() => handleDismiss(completion.key)}
                className="text-roa-text-muted hover:text-roa-text-primary transition-colors flex-shrink-0 text-lg leading-none"
                aria-label="Dismiss notification"
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
