import React, { useState, useEffect } from 'react';
import { MessageCircle, Sparkles, AlertCircle } from 'lucide-react';
import { AIProviderStatus } from '@shared/types/ai';

interface QuickAskRoaProps {
  onNavigateToAI: () => void;
}

export const QuickAskRoa: React.FC<QuickAskRoaProps> = ({ onNavigateToAI }) => {
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

  const isAvailable = aiProvider === 'gemini' && aiStatus === 'connected';

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-roa-text-primary">Ask Roa</h2>

      <div className="bg-roa-surface border border-roa-divider rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isAvailable ? 'bg-roa-surface-tint' : 'bg-roa-divider/30'
          }`}>
            {isAvailable ? (
              <Sparkles className="w-4 h-4 text-roa-primary-sage" />
            ) : (
              <MessageCircle className="w-4 h-4 text-roa-text-light-muted" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-roa-text-secondary">
              {isAvailable ? 'Assistant ready' : 'Assistant offline'}
            </p>
            <p className="text-xs text-roa-text-muted mt-0.5">
              {isAvailable 
                ? 'Chat with Roa about tasks, reminders, and productivity' 
                : 'Configure your AI assistant in Settings to get started'}
            </p>
          </div>
        </div>

        {isAvailable ? (
          <button
            onClick={onNavigateToAI}
            className="w-full px-4 py-2.5 rounded-lg border border-roa-divider bg-roa-background hover:bg-roa-surface-tint text-roa-text-secondary text-sm font-medium transition-colors text-left flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-roa-text-muted" />
            <span>Start a conversation...</span>
          </button>
        ) : (
          <button
            onClick={onNavigateToAI}
            className="w-full px-4 py-2.5 rounded-lg border-[1.5px] border-roa-primary-sage text-roa-primary-sage hover:bg-roa-surface-tint text-sm font-semibold transition-colors"
          >
            Open Ask Roa
          </button>
        )}
      </div>
    </div>
  );
};
