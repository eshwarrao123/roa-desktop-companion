import React from 'react';
import { Send } from 'lucide-react';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isConfigured?: boolean;
  isElectron?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  isLoading = false,
  isConfigured = false,
  isElectron = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const getPlaceholder = () => {
    if (!isElectron) {
      return 'This screen is available inside the ROA desktop application.';
    }
    if (!isConfigured) {
      return 'Configure your AI assistant in Settings to get started';
    }
    return 'Ask a question or say "Remind me to stretch in 30 minutes"...';
  };

  return (
    <div className="border-t border-roa-divider pt-4">
      <div className="flex items-end gap-3 bg-roa-surface border border-roa-divider rounded-lg p-3 focus-within:border-roa-primary-sage transition-colors">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={getPlaceholder()}
          rows={1}
          className="flex-1 bg-transparent text-sm text-roa-text-secondary placeholder-roa-text-light-muted focus:outline-none disabled:opacity-50 resize-none min-h-[24px] max-h-[120px]"
          style={{
            height: 'auto',
            overflowY: value.split('\n').length > 3 ? 'auto' : 'hidden'
          }}
        />
        
        <button
          onClick={onSend}
          disabled={!value.trim() || isLoading || disabled}
          className="p-2 rounded-lg bg-roa-primary-sage hover:bg-roa-dark-sage disabled:opacity-30 disabled:hover:bg-roa-primary-sage text-roa-surface transition-colors flex-shrink-0"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
