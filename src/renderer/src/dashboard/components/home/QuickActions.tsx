import React, { useState, useEffect } from 'react';
import { SectionLabel } from '../ui/SectionLabel';
import { AIProviderStatus } from '@shared/types/ai';

interface QuickActionsProps {
  onNavigateToFocus: () => void;
  onNavigateToReminders: () => void;
  onNavigateToAI: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onNavigateToFocus,
  onNavigateToReminders,
  onNavigateToAI,
}) => {
  const [aiStatus, setAiStatus] = useState<AIProviderStatus>('not_configured');
  const [aiProvider, setAiProvider] = useState<'disabled' | 'gemini'>('disabled');

  useEffect(() => {
    if (window.roa?.ai?.getStatus) {
      window.roa.ai.getStatus().then((info) => {
        setAiProvider(info.provider);
        setAiStatus(info.status);
      }).catch(console.error);

      const unsubscribe = window.roa.ai.onStatusChanged?.((info) => {
        setAiProvider(info.provider);
        setAiStatus(info.status);
      });

      return () => {
        unsubscribe?.();
      };
    }
    return undefined;
  }, []);

  const isAIAvailable = aiProvider === 'gemini' && aiStatus === 'connected';

  return (
    <div className="space-y-3">
      <SectionLabel>QUICK ACTIONS</SectionLabel>
      <div className="space-y-2">
        <button
          onClick={onNavigateToFocus}
          className="block text-secondary text-roa-sage hover:text-roa-sage-hover transition-colors"
        >
          Start Focus →
        </button>
        <button
          onClick={onNavigateToReminders}
          className="block text-secondary text-roa-sage hover:text-roa-sage-hover transition-colors"
        >
          New Reminder →
        </button>
        <button
          onClick={onNavigateToAI}
          className="block text-secondary text-roa-sage hover:text-roa-sage-hover transition-colors"
        >
          Ask Roa →
        </button>
        {!isAIAvailable && (
          <p className="text-xs text-roa-text-muted pt-1">
            Configure AI assistant in Settings
          </p>
        )}
      </div>
    </div>
  );
};
