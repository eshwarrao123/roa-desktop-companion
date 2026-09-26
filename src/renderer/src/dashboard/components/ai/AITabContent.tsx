import React, { useState, useEffect } from 'react';
import { AIMessage, AIStatusInfo, ToolActivity } from '@shared/types/ai';
import { ConversationView } from './ConversationView';
import { Composer } from './Composer';
import { ContextPanel } from './ContextPanel';
import { AlertCircle, WifiOff, Trash2, ArrowRight, Sparkles } from 'lucide-react';

interface AITabContentProps {
  onNavigateToSettings?: () => void;
}

export const AITabContent: React.FC<AITabContentProps> = ({ onNavigateToSettings }) => {
  const isElectron = typeof window !== 'undefined' && Boolean(window.roa);
  const isAiBridgeAvailable = isElectron && Boolean(window.roa?.ai);

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<AIStatusInfo | null>(null);
  const [toolActivities, setToolActivities] = useState<ToolActivity[]>([]);

  useEffect(() => {
    if (window.roa?.ai) {
      window.roa.ai.getStatus().then(setStatusInfo).catch(console.error);
      window.roa.ai.getMessages().then(setMessages).catch(console.error);

      const unsubTool = window.roa.ai.onToolActivity((activity) => {
        setToolActivities((prev) => [...prev, activity]);
      });

      const unsubStatus = window.roa.ai.onStatusChanged?.((info) => {
        setStatusInfo(info);
      });

      return () => {
        unsubTool?.();
        unsubStatus?.();
      };
    }
    return undefined;
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);
    setToolActivities([]);

    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      conversationId: 'default-conversation',
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    if (!window.roa?.ai) {
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        conversationId: 'default-conversation',
        role: 'assistant',
        content: 'This screen is available inside the ROA desktop application.',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await window.roa.ai.chat(text);
      setMessages((prev) => {
        return [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, response.message];
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        conversationId: 'default-conversation',
        role: 'assistant',
        content: `Error: ${err?.message || 'Failed to get response from AI.'}`,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setToolActivities([]);
    }
  };

  const handleClearChat = async () => {
    if (window.roa?.ai) {
      await window.roa.ai.clearConversation();
    }
    setMessages([]);
    setToolActivities([]);
  };

  const quickPrompts = [
    { label: 'Remind to stretch in 30m', query: 'Remind me to stretch in 30 minutes' },
    { label: 'Start 25m focus timer', query: 'Start a 25 minute focus timer' },
    { label: 'Check battery status', query: 'What is my current battery status?' },
    { label: 'Today summary', query: 'Give me a summary of my day and upcoming reminders' },
  ];

  const isConfigured = statusInfo?.isConfigured && statusInfo?.provider === 'gemini';
  const serviceStatus = statusInfo?.serviceStatus ?? 'unknown';
  const isFullyAvailable = isConfigured && serviceStatus === 'available';
  const isDailyQuota = serviceStatus === 'daily_quota_exceeded';
  const isTemporarilyUnavailable = serviceStatus === 'temporarily_unavailable';

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)] max-w-7xl mx-auto">
      {/* Main conversation area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-roa-divider">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-roa-text-primary">Ask Roa</h2>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isFullyAvailable
                ? 'bg-roa-surface-tint text-roa-primary-sage border border-roa-primary-sage/20'
                : 'bg-roa-divider/30 text-roa-text-muted border border-roa-divider'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                isFullyAvailable ? 'bg-roa-primary-sage' : 'bg-roa-text-muted'
              }`} />
              {isFullyAvailable ? 'Connected' : isConfigured ? 'Ready' : 'Offline'}
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-roa-divider hover:bg-roa-surface-tint text-roa-text-muted hover:text-roa-text-secondary text-xs transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Browser Environment Notice */}
        {!isElectron && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50/50 border border-roa-warm-clay/20 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-roa-warm-clay shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-roa-text-primary block">
                Desktop Application Required
              </span>
              <span className="text-roa-text-muted block mt-0.5">
                This screen is available inside the ROA desktop application. The AI Assistant requires the Electron environment.
              </span>
            </div>
          </div>
        )}

        {/* Daily Quota Notice */}
        {isElectron && isConfigured && isDailyQuota && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50/50 border border-roa-warm-clay/20 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-roa-warm-clay shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-roa-text-primary block">
                Daily Limit Reached
              </span>
              <span className="text-roa-text-muted block mt-0.5">
                Gemini's free daily limit has been reached. Your API key is still valid.
                ROA's local reminders, timers, and other features continue to work.
              </span>
            </div>
          </div>
        )}

        {/* Temporarily Unavailable Notice */}
        {isElectron && isConfigured && isTemporarilyUnavailable && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50/50 border border-roa-warm-clay/20 flex items-start gap-3">
            <WifiOff className="w-4 h-4 text-roa-warm-clay shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-roa-text-primary block">
                Service Temporarily Unavailable
              </span>
              <span className="text-roa-text-muted block mt-0.5">
                Gemini is under high demand right now. Your API key is valid. Try again in a moment.
              </span>
            </div>
          </div>
        )}

        {/* Unconfigured Notice */}
        {isElectron && !isConfigured && (
          <div className="mt-4 p-4 rounded-lg bg-roa-surface-tint border border-roa-divider flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-roa-primary-sage shrink-0" />
              <span className="text-xs text-roa-text-secondary">
                Add your Google Gemini API key in Settings to activate natural-language reminders, timers, and chat.
              </span>
            </div>
            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-[1.5px] border-roa-primary-sage text-roa-primary-sage hover:bg-roa-surface-tint text-xs font-semibold shrink-0 ml-3 transition-colors"
              >
                Setup Key
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Conversation */}
        <div className="flex-1 py-6 min-h-0">
          <ConversationView
            messages={messages}
            isLoading={isLoading}
            toolActivities={toolActivities}
            quickPrompts={quickPrompts}
            onSelectPrompt={handleSendMessage}
            isElectron={isElectron}
          />
        </div>

        {/* Composer */}
        <Composer
          value={input}
          onChange={setInput}
          onSend={handleSendMessage}
          disabled={!isElectron}
          isLoading={isLoading}
          isConfigured={isConfigured}
          isElectron={isElectron}
        />
      </div>

      {/* Right context panel */}
      <div className="w-64 flex-shrink-0 py-6">
        <ContextPanel statusInfo={statusInfo} />
      </div>
    </div>
  );
};
