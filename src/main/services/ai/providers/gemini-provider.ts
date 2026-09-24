import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIChatResult } from './provider.interface';
import { AIProviderStatus, AIMessage, ToolActivity } from '@shared/types/ai';
import { CharacterManifest } from '@shared/types/pet';
import { CredentialStore } from '../credential-store';
import { ToolRegistry, ToolContext } from '../tools/registry';
import { buildSystemPrompt } from '../system-prompt';

/**
 * Internal Gemini model policy.
 * This is the single authoritative default — never exposed to the user.
 * Change this here only when the Gemini API releases a newer stable flash alias.
 */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';

function sanitizeError(errorStr: string, apiKey?: string): string {
  let sanitized = errorStr;
  if (apiKey && apiKey.trim().length > 4) {
    sanitized = sanitized.split(apiKey.trim()).join('[REDACTED_KEY]');
  }
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
  return sanitized;
}

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
    model = GEMINI_DEFAULT_MODEL
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
      const rawMessage = String(err?.message || err || '');
      const sanitized = sanitizeError(rawMessage, key);
      const status =
        err?.status ||
        err?.statusCode ||
        (err?.response ? err.response.status : undefined);
      const errCode =
        err?.code || (err?.cause ? (err.cause as any).code : undefined);

      console.error('[GeminiProvider] Connection test error:', sanitized);

      // 1. Invalid credential / Unauthenticated
      if (
        status === 401 ||
        sanitized.includes('API_KEY_INVALID') ||
        sanitized.includes('API key not valid') ||
        sanitized.includes('UNAUTHENTICATED')
      ) {
        this.lastStatus = 'invalid_credential';
        return {
          success: false,
          error: 'Invalid API key. Please check your key from Google AI Studio.',
          code: 'invalid_credential',
        };
      }

      // 2. Unauthorized / Permission denied
      if (
        status === 403 ||
        sanitized.includes('PERMISSION_DENIED') ||
        sanitized.includes('unauthorized')
      ) {
        this.lastStatus = 'invalid_credential';
        return {
          success: false,
          error:
            'Unauthorized: This API key does not have permission to access the Gemini API or the service is not enabled.',
          code: 'invalid_credential',
        };
      }

      // 3a. Daily quota exhausted (free tier limit reached)
      const isDailyQuota =
        (status === 429 &&
          (sanitized.includes('per day') ||
            sanitized.includes('daily') ||
            sanitized.includes('Free Tier'))) ||
        sanitized.includes('requests per day');

      if (isDailyQuota) {
        this.lastStatus = 'daily_quota_exceeded';
        return {
          success: false,
          error:
            "Gemini's free daily limit has been reached. Your API key is still valid. " +
            "You can continue using ROA's local features and try Gemini again after the quota resets.",
          code: 'daily_quota_exceeded',
        };
      }

      // 3b. Transient rate limit (not a daily quota)
      if (
        status === 429 ||
        sanitized.includes('RESOURCE_EXHAUSTED') ||
        sanitized.includes('quota') ||
        sanitized.includes('rate limit')
      ) {
        this.lastStatus = 'rate_limited';
        return {
          success: false,
          error:
            'Request rate limit reached. Please wait a moment and try again.',
          code: 'rate_limited',
        };
      }

      // 4. Network error / Offline
      if (
        errCode === 'ENOTFOUND' ||
        errCode === 'ECONNREFUSED' ||
        errCode === 'ETIMEDOUT' ||
        errCode === 'EHOSTUNREACH' ||
        sanitized.includes('fetch failed') ||
        sanitized.includes('NetworkError') ||
        sanitized.includes('network') ||
        sanitized.includes('getaddrinfo') ||
        sanitized.includes('UND_ERR_CONNECT_TIMEOUT')
      ) {
        this.lastStatus = 'offline';
        return {
          success: false,
          error:
            'Network error: Unable to reach Gemini API servers. Please check your internet connection.',
          code: 'offline',
        };
      }

      // 4b. Service temporarily unavailable (503 / high demand)
      if (
        status === 503 ||
        sanitized.includes('503') ||
        sanitized.includes('Service Unavailable') ||
        sanitized.includes('overloaded') ||
        sanitized.includes('high demand')
      ) {
        this.lastStatus = 'temporarily_unavailable';
        return {
          success: false,
          error:
            'Gemini is temporarily unavailable due to high demand. Your key is valid — try again in a moment.',
          code: 'temporarily_unavailable',
        };
      }

      // 5. Provider / API configuration error
      if (
        status === 404 ||
        sanitized.includes('NOT_FOUND') ||
        sanitized.includes('models/') ||
        sanitized.includes('not found')
      ) {
        this.lastStatus = 'error';
        return {
          success: false,
          error: `API configuration error: The Gemini service could not be reached. Please verify your key at Google AI Studio.`,
          code: 'error',
        };
      }

      if (status === 400 || sanitized.includes('INVALID_ARGUMENT')) {
        this.lastStatus = 'error';
        return {
          success: false,
          error: `API configuration error: Invalid request parameters (${sanitized}).`,
          code: 'error',
        };
      }

      // 6. Unknown / unexpected error
      this.lastStatus = 'error';
      return {
        success: false,
        error: `Gemini API error: ${sanitized}`,
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

    try {
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

      // Successful chat — service is available
      this.lastStatus = 'connected';

      return {
        content: finalText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      };
    } catch (err: any) {
      // Classify the chat error and update service status accordingly.
      // Credential is NOT invalidated by transient service failures.
      const rawMessage = String(err?.message || err || '');
      const sanitized = sanitizeError(rawMessage, apiKey);
      const status =
        err?.status ||
        err?.statusCode ||
        (err?.response ? err.response.status : undefined);
      const errCode =
        err?.code || (err?.cause ? (err.cause as any).code : undefined);

      console.error('[GeminiProvider] Chat error:', sanitized);

      // Daily quota exhausted
      const isDailyQuota =
        (status === 429 &&
          (sanitized.includes('per day') ||
            sanitized.includes('daily') ||
            sanitized.includes('Free Tier'))) ||
        sanitized.includes('requests per day');

      if (isDailyQuota) {
        this.lastStatus = 'daily_quota_exceeded';
        throw new Error(
          "Gemini's free daily limit has been reached. Your API key is still valid. " +
          "You can continue using ROA's local features and try Gemini again after the quota resets."
        );
      }

      // Transient rate limit
      if (status === 429 || sanitized.includes('RESOURCE_EXHAUSTED') || sanitized.includes('rate limit')) {
        this.lastStatus = 'rate_limited';
        throw new Error('Gemini is temporarily rate-limited. Please try again shortly.');
      }

      // 503 / high demand / service unavailable
      if (
        status === 503 ||
        sanitized.includes('503') ||
        sanitized.includes('Service Unavailable') ||
        sanitized.includes('overloaded') ||
        sanitized.includes('high demand')
      ) {
        this.lastStatus = 'temporarily_unavailable';
        throw new Error('Gemini is temporarily unavailable. Please try again shortly.');
      }

      // Network / offline
      if (
        errCode === 'ENOTFOUND' ||
        errCode === 'ECONNREFUSED' ||
        errCode === 'ETIMEDOUT' ||
        errCode === 'EHOSTUNREACH' ||
        sanitized.includes('fetch failed') ||
        sanitized.includes('NetworkError') ||
        sanitized.includes('getaddrinfo') ||
        sanitized.includes('UND_ERR_CONNECT_TIMEOUT')
      ) {
        this.lastStatus = 'offline';
        throw new Error("ROA can't reach Gemini right now. Check your internet connection.");
      }

      // Credential errors during chat (e.g. key revoked mid-session)
      if (
        status === 401 ||
        sanitized.includes('API_KEY_INVALID') ||
        sanitized.includes('API key not valid') ||
        sanitized.includes('UNAUTHENTICATED')
      ) {
        this.lastStatus = 'invalid_credential';
        throw new Error('Your Gemini API key is no longer valid. Please update it in Settings.');
      }

      // Unknown / other errors — do not expose raw SDK detail
      this.lastStatus = 'error';
      throw new Error('An unexpected error occurred while reaching Gemini. Please try again.');
    }
  }

  public async getStatus(): Promise<AIProviderStatus> {
    if (!(await this.isConfigured())) {
      return 'not_configured';
    }
    // If we've never tested, default to 'connected' (key exists, not yet validated)
    if (this.lastStatus === 'not_configured') {
      return 'connected';
    }
    return this.lastStatus;
  }
}
