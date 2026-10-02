import React from 'react';

interface QuickPromptsProps {
  prompts: Array<{ label: string; query: string }>;
  onSelectPrompt: (query: string) => void;
  disabled?: boolean;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ 
  prompts, 
  onSelectPrompt, 
  disabled = false 
}) => {
  return (
    <div className="space-y-2">
      <p className="text-micro uppercase text-roa-text-muted">Quick Actions</p>
      
      <div className="space-y-1.5">
        {prompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(prompt.query)}
            disabled={disabled}
            className="w-full text-left px-3 py-2 rounded-roa bg-roa-surface border border-roa-border hover:border-roa-sage hover:bg-roa-raised transition-colors disabled:opacity-50 disabled:hover:border-roa-border disabled:hover:bg-roa-surface group"
          >
            <span className="text-xs font-medium text-roa-text-secondary block group-hover:text-roa-sage transition-colors">
              {prompt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
