import React from 'react';
import { Sparkles } from 'lucide-react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-3">
      {/* Small Roa identity pip */}
      <div className="w-5 h-5 rounded-full bg-roa-surface-tint flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3 h-3 text-roa-primary-sage" />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-roa-text-muted">Roa is thinking</span>
        <div className="flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-roa-primary-sage animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-roa-primary-sage animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="w-1 h-1 rounded-full bg-roa-primary-sage animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
};
