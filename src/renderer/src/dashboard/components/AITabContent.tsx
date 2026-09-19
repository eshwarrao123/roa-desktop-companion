import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Battery,
  Flame,
  ArrowRight,
  Loader2,
  Wrench,
} from 'lucide-react';
import { AIMessage, AIStatusInfo, ToolActivity } from '@shared/types/ai';

interface AITabContentProps {
  onNavigateToSettings?: () => void;
}

export const AITabContent: React.FC<AITabContentProps> = ({ onNavigateToSettings }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<AIStatusInfo | null>(null);
  const [toolActivities, setToolActivities] = useState<ToolActivity[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (window.roa?.ai) {
      // Load status
      window.roa.ai.getStatus().then(setStatusInfo).catch(console.error);

      // Load previous messages
      window.roa.ai.getMessages().then(setMessages).catch(console.error);

      // Listen for tool activity
      const unsub = window.roa.ai.onToolActivity((activity) => {
        setToolActivities((prev) => [...prev, activity]);
      });

      return () => {
        unsub?.();
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, toolActivities, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);
    setToolActivities([]);

    // Optimistic user message
    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      conversationId: 'default-conversation',
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await window.roa.ai.chat(text);
      setMessages((prev) => {
        // Replace or append assistant message
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    if (window.roa?.ai) {
      await window.roa.ai.clearConversation();
      setMessages([]);
      setToolActivities([]);
    }
  };

  const quickPrompts = [
    { label: 'Remind to stretch in 30m', query: 'Remind me to stretch in 30 minutes' },
    { label: 'Start 25m focus timer', query: 'Start a 25 minute focus timer' },
    { label: 'Check battery status', query: 'What is my current battery status?' },
    { label: 'Today summary', query: 'Give me a summary of my day and upcoming reminders' },
  ];

  const isConfigured = statusInfo?.isConfigured && statusInfo?.provider === 'gemini';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#3D3D6B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">AI Companion</h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isConfigured
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {isConfigured ? 'Gemini Connected' : 'AI Offline'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {statusInfo?.model || 'gemini-3.8-flash'} • Local safe tool calling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Unconfigured Notice */}
      {!isConfigured && (
        <div className="mt-3 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs text-indigo-950 dark:text-indigo-200">
              Bring Your Own Key: Add your Google Gemini API key in Settings to activate natural-language reminders, timers, and chat.
            </span>
          </div>
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shrink-0 ml-3 transition-colors"
            >
              <span>Setup Key</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                How can your companion help today?
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Ask me to set reminders, start timers, check battery levels, or summarize your day.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-2 gap-2 max-w-md w-full pt-2">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] hover:border-indigo-300 dark:hover:border-indigo-600 text-left text-xs text-zinc-700 dark:text-zinc-300 transition-all shadow-sm group"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {p.label}
                  </span>
                  <span className="text-[11px] text-zinc-400 truncate block mt-0.5">
                    "{p.query}"
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] text-zinc-800 dark:text-zinc-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                {/* Render tool calls if present */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700/60 space-y-1">
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-[10px] font-mono text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>tool: {tc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 mt-1 px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {/* Live tool activities */}
        {toolActivities.length > 0 && (
          <div className="flex flex-col items-start space-y-1.5 pl-2">
            {toolActivities.map((act, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-indigo-700 dark:text-indigo-300"
              >
                {act.status === 'running' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>{act.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] w-fit">
            <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            <span className="text-xs text-zinc-500">Companion is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="pt-3 border-t border-zinc-200 dark:border-[#3D3D6B]">
        <div className="flex items-center gap-2 bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl px-3 py-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              isConfigured
                ? 'Ask a question or say "Remind me to drink water in 30 minutes"...'
                : 'AI disabled. Configure Gemini in Settings or use tabs directly.'
            }
            className="flex-1 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
