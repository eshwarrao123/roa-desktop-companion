import React from 'react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 space-y-1">
        <p className="text-micro uppercase text-roa-text-muted">ROA</p>
        <div className="flex items-center gap-2">
          <span className="text-body text-roa-text-muted">Thinking</span>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-roa-sage animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-roa-sage animate-pulse" style={{ animationDelay: '200ms' }} />
            <span className="w-1 h-1 rounded-full bg-roa-sage animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
