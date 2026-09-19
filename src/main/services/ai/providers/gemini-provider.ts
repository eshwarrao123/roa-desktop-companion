import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIChatResult } from './provider.interface';
import { AIProviderStatus, AIMessage, ToolActivity } from '@shared/types/ai';
import { CharacterManifest } from '@shared/types/pet';
import { CredentialStore } from '../credential-store';
import { ToolRegistry, ToolContext } from '../tools/registry';
import { buildSystemPrompt } from '../system-prompt';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  private credentialStore: CredentialStore;
  private toolRegistry: ToolRegistry;
  private toolContext: ToolContext;
  private model: string;
  private lastStatus: AIProviderStatus = 'not_configured';

  constructor(
    credentialStore: CredentialStore,
    toolRegistry: ToolRegistry,
    toolContext: ToolContext,
    model = 'gemini-3.8-flash'
  ) {
    this.credentialStore = credentialStore;
    this.toolRegistry = toolRegistry;
    this.toolContext = toolContext;
    this.model = model;
  }

  public setModel(model: string): void {
    this.model = model;
  }

  public async isConfigured(): Promise<boolean> {
    return this.credentialStore.hasApiKey();
  }

  public async testConnection(apiKey?: string): Promise<{
    success: boolean;
    error?: string;
    code?: AIProviderStatus;
  }> {
    const key = apiKey || (await this.credentialStore.getApiKey());
    if (!key || !key.trim()) {
      this.lastStatus = 'not_configured';
      return {
        success: false,
        error: 'No API key provided.',
        code: 'not_configured',
      };
    }

    try {
      const client = new GoogleGenAI({ apiKey: key.trim() });
      await client.interactions.create({
        model: this.model,
        input: 'Test connection. Respond with OK.',
      });

      this.lastStatus = 'connected';
      return { success: true };
    } catch (err: any) {
      const errorStr = String(err?.message || err);
      console.error('[GeminiProvider] Connection test error:', errorStr);

      if (
        errorStr.includes('API_KEY_INVALID') ||
        errorStr.includes('401') ||
        errorStr.includes('403') ||
        errorStr.includes('UNAUTHENTICATED')
      ) {
        this.lastStatus = 'invalid_credential';
        return {
          success: false,
          error: 'Invalid API key or authentication failed.',
          code: 'invalid_credential',
        };
      }

      if (
        errorStr.includes('429') ||
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('quota')
      ) {
        this.lastStatus = 'rate_limited';
        return {
          success: false,
          error: 'Rate limit or quota exceeded.',
          code: 'rate_limited',
        };
      }

      if (
        errorStr.includes('ENOTFOUND') ||
        errorStr.includes('ECONNREFUSED') ||
        errorStr.includes('fetch failed') ||
        errorStr.includes('network')
      ) {
        this.lastStatus = 'offline';
        return {
          success: false,
          error: 'Network error: unable to reach Gemini servers.',
          code: 'offline',
        };
      }

      this.lastStatus = 'error';
      return {
        success: false,
        error: `Gemini API error: ${errorStr}`,
        code: 'error',
      };
    }
  }

  public async chat(
    messages: AIMessage[],
    character: CharacterManifest | null,
    onToolActivity?: (activity: ToolActivity) => void
  ): Promise<AIChatResult> {
    const apiKey = await this.credentialStore.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const client = new GoogleGenAI({ apiKey });
    const systemInstruction = buildSystemPrompt(character);
    const tools = this.toolRegistry.getFunctionDeclarations();

    // Format recent conversation context for the model input
    const recentMessages = messages.slice(-8);
    const conversationContext = recentMessages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `${conversationContext}\n\nAssistant:`;

    const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];
    const toolResults: Array<{ callId: string; name: string; result: unknown }> = [];

    let currentInteraction = await client.interactions.create({
      model: this.model,
      system_instruction: systemInstruction,
      input: prompt,
      tools,
    });

    // Check if model requested function calls
    if (currentInteraction.steps) {
      for (const step of currentInteraction.steps) {
        if (step.type === 'function_call') {
          const callId = (step as any).id || `call_${Date.now()}`;
          const name = (step as any).name;
          const args = ((step as any).arguments || {}) as Record<string, unknown>;

          toolCalls.push({ id: callId, name, args });

          onToolActivity?.({
            toolName: name,
            status: 'running',
            label: `Executing ${name}...`,
          });

          // Execute tool through allowlisted registry
          const execution = await this.toolRegistry.execute(name, args, this.toolContext);

          if (execution.success) {
            onToolActivity?.({
              toolName: name,
              status: 'completed',
              label: `Completed ${name}`,
            });
          } else {
            onToolActivity?.({
              toolName: name,
              status: 'error',
              label: `Failed: ${execution.error}`,
            });
          }

          const resultPayload = execution.success ? execution.result : { error: execution.error };
          toolResults.push({ callId, name, result: resultPayload });

          // Send function result back to Gemini to produce final response
          try {
            currentInteraction = await client.interactions.create({
              model: this.model,
              input: [
                {
                  type: 'function_result',
                  name,
                  call_id: callId,
                  result: [{ type: 'text', text: JSON.stringify(resultPayload) }],
                },
              ],
              tools,
              previous_interaction_id: currentInteraction.id,
            });
          } catch (resubmitErr) {
            console.error('[GeminiProvider] Error submitting function result:', resubmitErr);
            break;
          }
        }
      }
    }

    const finalText =
      currentInteraction.output_text ||
      'I processed your request, but did not receive text from the model.';

    return {
      content: finalText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    };
  }

  public async getStatus(): Promise<AIProviderStatus> {
    if (!(await this.isConfigured())) {
      return 'not_configured';
    }
    return this.lastStatus === 'not_configured' ? 'connected' : this.lastStatus;
  }
}
