import { EventEmitter } from 'events';
import type Database from 'better-sqlite3';
import { getDb } from '../../db';
import {
  AIStatusInfo,
  AIProviderStatus,
  AICredentialStatus,
  AIServiceStatus,
  AIMessage,
  AIChatResponse,
  ToolActivity,
} from '@shared/types/ai';
import { CredentialStore, getCredentialStore } from './credential-store';
import { ToolRegistry } from './tools/registry';
import { registerDefaultTools } from './tools/implementations';
import { AIProvider } from './providers/provider.interface';
import { GeminiProvider, GEMINI_DEFAULT_MODEL } from './providers/gemini-provider';
import { DisabledProvider } from './providers/disabled-provider';
import { SettingsStore } from '../settings-store';
import { CharacterRegistry } from '../character-registry';
import { ReminderEngine } from '../reminder-engine';
import { TimerEngine } from '../timer-engine';
import { SystemService } from '../system-service';
import { WindowManager } from '../../window-manager';

export class AIService extends EventEmitter {
  private db: Database.Database;
  private credentialStore: CredentialStore;
  private settingsStore: SettingsStore;
  private characterRegistry: CharacterRegistry;
  private windowManager: WindowManager;
  private toolRegistry: ToolRegistry;

  private geminiProvider: GeminiProvider;
  private disabledProvider: DisabledProvider;
  private activeConversationId: string = 'default-conversation';

  constructor(
    settingsStore: SettingsStore,
    characterRegistry: CharacterRegistry,
    reminderEngine: ReminderEngine,
    timerEngine: TimerEngine,
    systemService: SystemService,
    windowManager: WindowManager,
    credentialStore?: CredentialStore,
    db?: Database.Database
  ) {
    super();
    this.db = db ?? getDb();
    this.settingsStore = settingsStore;
    this.characterRegistry = characterRegistry;
    this.windowManager = windowManager;
    this.credentialStore = credentialStore ?? getCredentialStore();

    // 1. Initialize Tool Registry and register 10 default safe tools
    this.toolRegistry = new ToolRegistry();
    registerDefaultTools(this.toolRegistry);

    const toolContext = {
      reminderEngine,
      timerEngine,
      systemService,
      settingsStore,
      characterRegistry,
    };

    // 2. Instantiate providers
    this.geminiProvider = new GeminiProvider(
      this.credentialStore,
      this.toolRegistry,
      toolContext,
      GEMINI_DEFAULT_MODEL
    );
    this.disabledProvider = new DisabledProvider();

    // 3. Ensure default conversation exists
    this.ensureDefaultConversation();

    // 4. No model change listener needed — model is centrally managed.
  }

  private ensureDefaultConversation(): void {
    try {
      const existing = this.db
        .prepare('SELECT id FROM ai_conversations WHERE id = ?')
        .get(this.activeConversationId);
      if (!existing) {
        this.db
          .prepare(
            'INSERT INTO ai_conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)'
          )
          .run(this.activeConversationId, 'General Chat', Date.now(), Date.now());
      }
    } catch (err) {
      console.error('[AIService] Failed to ensure default conversation:', err);
    }
  }

  private getActiveProvider(): AIProvider {
    const providerSetting = this.settingsStore.get('ai.provider');
    if (providerSetting === 'gemini') {
      return this.geminiProvider;
    }
    return this.disabledProvider;
  }

  public async getStatus(): Promise<AIStatusInfo> {
    const providerSetting = this.settingsStore.get('ai.provider');
    const isConfigured = await this.credentialStore.hasApiKey();
    const maskedKey = await this.credentialStore.getMaskedKey();

    let status: AIProviderStatus = 'not_configured';
    if (providerSetting === 'gemini') {
      status = await this.geminiProvider.getStatus();
    }

    // Derive credential status (not affected by transient service errors)
    let credentialStatus: AICredentialStatus = 'not_configured';
    if (isConfigured) {
      credentialStatus =
        status === 'invalid_credential' ? 'invalid' : 'verified';
    }

    // Derive service status
    let serviceStatus: AIServiceStatus = 'unknown';
    if (!isConfigured || providerSetting !== 'gemini') {
      serviceStatus = 'unknown';
    } else if (status === 'connected') {
      serviceStatus = 'available';
    } else if (status === 'temporarily_unavailable') {
      serviceStatus = 'temporarily_unavailable';
    } else if (status === 'daily_quota_exceeded') {
      serviceStatus = 'daily_quota_exceeded';
    } else if (status === 'rate_limited') {
      serviceStatus = 'rate_limited';
    } else if (status === 'offline') {
      serviceStatus = 'offline';
    } else if (status === 'error' || status === 'invalid_credential') {
      serviceStatus = 'unknown';
    }

    const meta = this.db
      .prepare('SELECT last_tested_at, last_error_category FROM ai_provider_metadata WHERE provider_id = ?')
      .get('gemini') as { last_tested_at?: number; last_error_category?: string } | undefined;

    return {
      provider: providerSetting,
      status,
      isConfigured,
      credentialStatus,
      serviceStatus,
      maskedKey: maskedKey || undefined,
      lastTestedAt: meta?.last_tested_at,
      lastErrorCategory: meta?.last_error_category,
    };
  }

  public async testConnection(
    apiKey?: string
  ): Promise<{ success: boolean; error?: string; code?: AIProviderStatus }> {
    const result = await this.geminiProvider.testConnection(apiKey);
    const now = Date.now();

    try {
      this.db
        .prepare(
          `INSERT INTO ai_provider_metadata (provider_id, is_configured, model, last_tested_at, last_error_category, updated_at)
           VALUES ('gemini', ?, ?, ?, ?, ?)
           ON CONFLICT(provider_id) DO UPDATE SET
             is_configured = excluded.is_configured,
             model = excluded.model,
             last_tested_at = excluded.last_tested_at,
             last_error_category = excluded.last_error_category,
             updated_at = excluded.updated_at`
        )
        .run(
          result.success ? 1 : 0,
          this.settingsStore.get('ai.model'),
          now,
          result.error ? result.code : null,
          now
        );
    } catch (err) {
      console.error('[AIService] Failed to update provider metadata:', err);
    }

    return result;
  }

  public async saveCredential(apiKey: string): Promise<boolean> {
    await this.credentialStore.saveApiKey(apiKey);
    this.settingsStore.set('ai.provider', 'gemini');

    // Test connection after saving
    await this.testConnection(apiKey);
    return true;
  }

  public async removeCredential(): Promise<boolean> {
    await this.credentialStore.removeApiKey();
    this.settingsStore.set('ai.provider', 'disabled');

    try {
      this.db
        .prepare(
          `UPDATE ai_provider_metadata SET is_configured = 0, last_error_category = NULL, updated_at = ? WHERE provider_id = 'gemini'`
        )
        .run(Date.now());
    } catch (err) {
      console.error('[AIService] Failed to clear provider metadata:', err);
    }

    return true;
  }

  public async getMessages(): Promise<AIMessage[]> {
    try {
      const rows = this.db
        .prepare(
          `SELECT id, conversation_id, role, content, tool_calls_json, tool_results_json, created_at
           FROM ai_messages
           WHERE conversation_id = ?
           ORDER BY created_at ASC`
        )
        .all(this.activeConversationId) as Array<{
        id: string;
        conversation_id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        tool_calls_json: string | null;
        tool_results_json: string | null;
        created_at: number;
      }>;

      return rows.map((r) => ({
        id: r.id,
        conversationId: r.conversation_id,
        role: r.role,
        content: r.content,
        toolCalls: r.tool_calls_json ? JSON.parse(r.tool_calls_json) : undefined,
        toolResults: r.tool_results_json ? JSON.parse(r.tool_results_json) : undefined,
        createdAt: r.created_at,
      }));
    } catch (err) {
      console.error('[AIService] Failed to retrieve messages:', err);
      return [];
    }
  }

  public async clearConversation(): Promise<void> {
    try {
      this.db
        .prepare('DELETE FROM ai_messages WHERE conversation_id = ?')
        .run(this.activeConversationId);
    } catch (err) {
      console.error('[AIService] Failed to clear conversation:', err);
    }
  }

  public async chat(userText: string): Promise<AIChatResponse> {
    const trimmed = userText.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty');
    }

    const now = Date.now();
    const userMsgId = `msg-${now}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Persist user message in SQLite
    this.db
      .prepare(
        `INSERT INTO ai_messages (id, conversation_id, role, content, created_at)
         VALUES (?, ?, 'user', ?, ?)`
      )
      .run(userMsgId, this.activeConversationId, trimmed, now);

    // 2. Notify pet window of thinking state
    const petWin = this.windowManager.getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('roa:pet:timerEvent', {
        type: 'aiThinking',
        title: 'Thinking...',
      });
    }

    // 3. Load full conversation history for context
    const allMessages = await this.getMessages();
    const activeCharacter = this.characterRegistry.getActive();
    const provider = this.getActiveProvider();

    const toolActivities: ToolActivity[] = [];

    let chatResult;
    try {
      chatResult = await provider.chat(allMessages, activeCharacter, (activity) => {
        toolActivities.push(activity);
        this.emit('toolActivity', activity);
        const dashWin = this.windowManager.getDashboardWindow();
        if (dashWin && !dashWin.isDestroyed()) {
          dashWin.webContents.send('roa:ai:toolActivity', activity);
        }
      });
    } catch (err: any) {
      console.error('[AIService] Chat generation failed:', err);
      // Pet reaction to failure
      if (petWin && !petWin.isDestroyed()) {
        petWin.webContents.send('roa:pet:timerEvent', {
          type: 'aiComplete',
          title: 'Hmm, something went wrong.',
        });
      }
      // Push updated service status to the dashboard so badges refresh immediately
      try {
        const updatedStatus = await this.getStatus();
        const dashWin = this.windowManager.getDashboardWindow();
        if (dashWin && !dashWin.isDestroyed()) {
          dashWin.webContents.send('roa:ai:statusChanged', updatedStatus);
        }
      } catch {
        // Non-critical — status push failure must not mask the original error
      }
      throw err;
    }

    // 4. Persist assistant message in SQLite
    const assistantNow = Date.now();
    const assistantMsgId = `msg-${assistantNow}-${Math.random().toString(36).slice(2, 7)}`;

    this.db
      .prepare(
        `INSERT INTO ai_messages (id, conversation_id, role, content, tool_calls_json, tool_results_json, created_at)
         VALUES (?, ?, 'assistant', ?, ?, ?, ?)`
      )
      .run(
        assistantMsgId,
        this.activeConversationId,
        chatResult.content,
        chatResult.toolCalls ? JSON.stringify(chatResult.toolCalls) : null,
        chatResult.toolResults ? JSON.stringify(chatResult.toolResults) : null,
        assistantNow
      );

    // 5. Notify pet window of completion / celebration
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('roa:pet:timerEvent', {
        type: 'aiComplete',
        title: 'All done!',
      });
    }

    const responseMessage: AIMessage = {
      id: assistantMsgId,
      conversationId: this.activeConversationId,
      role: 'assistant',
      content: chatResult.content,
      toolCalls: chatResult.toolCalls,
      toolResults: chatResult.toolResults,
      createdAt: assistantNow,
    };

    return {
      message: responseMessage,
      toolActivity: toolActivities,
    };
  }
}

let aiServiceInstance: AIService | null = null;
export function getAIService(
  settingsStore?: SettingsStore,
  characterRegistry?: CharacterRegistry,
  reminderEngine?: ReminderEngine,
  timerEngine?: TimerEngine,
  systemService?: SystemService,
  windowManager?: WindowManager
): AIService {
  if (!aiServiceInstance && settingsStore && characterRegistry && reminderEngine && timerEngine && systemService && windowManager) {
    aiServiceInstance = new AIService(
      settingsStore,
      characterRegistry,
      reminderEngine,
      timerEngine,
      systemService,
      windowManager
    );
  }
  return aiServiceInstance!;
}
