import React from 'react';
import { AIMessage } from '@shared/types/ai';

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
          <div className="flex-1 space-y-1">
            <p className="text-micro uppercase text-roa-text-muted">ROA</p>
            <div className="prose prose-sm max-w-none">
              <p className="text-body text-roa-text-primary leading-relaxed whitespace-pre-wrap m-0">
                {message.content}
              </p>
            </div>
            
            <span className="text-[10px] text-roa-text-muted">
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
            <div className="bg-roa-raised border border-roa-border rounded-roa px-4 py-2.5">
              <p className="text-body text-roa-text-primary leading-relaxed whitespace-pre-wrap m-0">
                {message.content}
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] text-roa-text-muted">
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
