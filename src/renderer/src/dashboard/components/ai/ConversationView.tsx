import React, { useRef, useEffect } from 'react';
import { AIMessage, ToolActivity } from '@shared/types/ai';
import { MessageRow } from './MessageRow';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ToolActionReceipt } from './ToolActionReceipt';
import { QuickPrompts } from './QuickPrompts';

interface ConversationViewProps {
  messages: AIMessage[];
  isLoading: boolean;
  toolActivities: ToolActivity[];
  quickPrompts: Array<{ label: string; query: string }>;
  onSelectPrompt: (query: string) => void;
  isElectron: boolean;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  isLoading,
  toolActivities,
  quickPrompts,
  onSelectPrompt,
  isElectron,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, toolActivities, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-start justify-center space-y-6 py-12 max-w-2xl">
          <div className="space-y-2">
            <h3 className="text-section-title text-roa-text-primary">
              What can Roa help with?
            </h3>
            <p className="text-body text-roa-text-secondary max-w-lg">
              Ask me to set reminders, start timers, check battery levels, or summarize your day.
            </p>
          </div>

          <div className="w-full max-w-md">
            <QuickPrompts 
              prompts={quickPrompts}
              onSelectPrompt={onSelectPrompt}
              disabled={!isElectron}
            />
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <MessageRow key={msg.id} message={msg} />
          ))}

          {/* Live tool activities */}
          {toolActivities.length > 0 && (
            <div className="space-y-2">
              {toolActivities.map((activity, idx) => (
                <ToolActionReceipt key={idx} activity={activity} />
              ))}
            </div>
          )}

          {/* Thinking indicator */}
          {isLoading && <ThinkingIndicator />}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};
