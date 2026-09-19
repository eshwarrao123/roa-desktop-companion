import { AIProviderId, AIProviderStatus, AIMessage, ToolActivity } from '@shared/types/ai';
import { CharacterManifest } from '@shared/types/pet';

export interface AIChatResult {
  content: string;
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  toolResults?: Array<{ callId: string; name: string; result: unknown }>;
}

export interface AIProvider {
  id: AIProviderId;
  isConfigured(): Promise<boolean>;
  testConnection(apiKey?: string): Promise<{ success: boolean; error?: string; code?: string }>;
  chat(
    messages: AIMessage[],
    character: CharacterManifest | null,
    onToolActivity?: (activity: ToolActivity) => void
  ): Promise<AIChatResult>;
  getStatus(): Promise<AIProviderStatus>;
}
