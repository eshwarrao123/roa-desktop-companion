import { AIProvider, AIChatResult } from './provider.interface';
import { AIProviderStatus, AIMessage } from '@shared/types/ai';

export class DisabledProvider implements AIProvider {
  public readonly id = 'disabled';

  public async isConfigured(): Promise<boolean> {
    return false;
  }

  public async testConnection(): Promise<{ success: boolean; error?: string; code?: string }> {
    return {
      success: false,
      error: 'AI assistant is disabled. To enable, configure your Gemini API key in Settings.',
      code: 'disabled',
    };
  }

  public async chat(messages: AIMessage[]): Promise<AIChatResult> {
    const lastMsg = messages[messages.length - 1];
    const lastUserMessage =
      typeof lastMsg?.content === 'string' ? lastMsg.content.toLowerCase() : '';

    let helpfulHint = 'AI Assistant is currently disabled. All core ROA features remain fully functional!';
    if (lastUserMessage.includes('remind')) {
      helpfulHint += ' You can view and create reminders directly in the Reminders tab.';
    } else if (lastUserMessage.includes('timer') || lastUserMessage.includes('pomodoro')) {
      helpfulHint += ' You can start countdown timers or Pomodoro sessions in the Timers tab.';
    } else {
      helpfulHint += ' To chat with your pet or use natural-language commands, configure your Gemini API key in Settings.';
    }

    return {
      content: helpfulHint,
    };
  }

  public async getStatus(): Promise<AIProviderStatus> {
    return 'not_configured';
  }
}
