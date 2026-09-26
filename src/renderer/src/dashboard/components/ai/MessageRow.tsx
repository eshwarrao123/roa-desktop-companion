import React from 'react';
import { AIMessage } from '@shared/types/ai';
import { Sparkles } from 'lucide-react';

interface MessageRowProps {
  message: AIMessage;
}

export const MessageRow: React.FC<MessageRowProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className="space-y-2">
      {isAssistant && (
        <div className="flex items-start gap-3">
          {/* Small Roa identity pip (20-24px) */}
          <div className="w-5 h-5 rounded-full bg-roa-surface-tint flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-3 h-3 text-roa-primary-sage" />
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-roa-text-secondary leading-relaxed whitespace-pre-wrap m-0">
                {message.content}
              </p>
            </div>
            
            <span className="text-[10px] text-roa-text-light-muted">
              {new Date(message.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      )}

      {isUser && (
        <div className="flex justify-end">
          <div className="max-w-[70%] space-y-1">
            <div className="bg-roa-surface-tint border border-roa-divider rounded-lg px-4 py-2.5">
              <p className="text-sm text-roa-text-secondary leading-relaxed whitespace-pre-wrap m-0">
                {message.content}
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] text-roa-text-light-muted">
                {new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
