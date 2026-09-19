import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { AIService } from '../../src/main/services/ai/ai-service';
import { SettingsStore } from '../../src/main/services/settings-store';
import { CharacterRegistry } from '../../src/main/services/character-registry';
import { CredentialStore } from '../../src/main/services/ai/credential-store';
import { WindowManager } from '../../src/main/window-manager';

describe('AIService', () => {
  let settingsDb: Map<string, any>;
  let messagesDb: any[];
  let metadataDb: Map<string, any>;
  let mockDb: Database.Database;

  let settingsStore: SettingsStore;
  let characterRegistry: CharacterRegistry;
  let credentialStore: CredentialStore;
  let windowManager: WindowManager;
  let aiService: AIService;

  beforeEach(() => {
    settingsDb = new Map();
    messagesDb = [];
    metadataDb = new Map();

    mockDb = {
      prepare: (sql: string) => {
        if (sql.includes('SELECT key, value_json FROM settings')) {
          return { all: () => Array.from(settingsDb.values()) };
        }
        if (sql.includes('INSERT INTO settings')) {
          return {
            run: (key: string, value_json: string, updated_at: number) => {
              settingsDb.set(key, { key, value_json, updated_at });
              return { changes: 1 };
            },
          };
        }
        if (sql.includes('SELECT id FROM ai_conversations')) {
          return { get: () => ({ id: 'default-conversation' }) };
        }
        if (sql.includes('INSERT INTO ai_conversations')) {
          return { run: () => ({ changes: 1 }) };
        }
        if (sql.includes('SELECT id, conversation_id, role, content')) {
          return {
            all: () => messagesDb,
          };
        }
        if (sql.includes('INSERT INTO ai_messages')) {
          return {
            run: (...args: any[]) => {
              if (sql.includes("'user'")) {
                const [id, convId, content, created] = args;
                messagesDb.push({
                  id,
                  conversation_id: convId,
                  role: 'user',
                  content,
                  tool_calls_json: null,
                  tool_results_json: null,
                  created_at: created,
                });
              } else {
                const [id, convId, content, tc, tr, created] = args;
                messagesDb.push({
                  id,
                  conversation_id: convId,
                  role: 'assistant',
                  content,
                  tool_calls_json: tc,
                  tool_results_json: tr,
                  created_at: created,
                });
              }
              return { changes: 1 };
            },
          };
        }
        if (sql.includes('DELETE FROM ai_messages')) {
          return {
            run: () => {
              messagesDb = [];
              return { changes: 1 };
            },
          };
        }
        if (sql.includes('SELECT last_tested_at, last_error_category FROM ai_provider_metadata')) {
          return {
            get: () => metadataDb.get('gemini'),
          };
        }
        if (sql.includes('INSERT INTO ai_provider_metadata')) {
          return {
            run: (isConf: number, model: string, tested: number, err: any, upd: number) => {
              metadataDb.set('gemini', {
                provider_id: 'gemini',
                is_configured: isConf,
                model,
                last_tested_at: tested,
                last_error_category: err,
                updated_at: upd,
              });
              return { changes: 1 };
            },
          };
        }
        return {
          run: () => ({ changes: 1 }),
          get: () => undefined,
          all: () => [],
        };
      },
    } as unknown as Database.Database;

    settingsStore = new SettingsStore(mockDb);
    characterRegistry = {
      getActive: () => ({ name: 'ROA Cat', personality: { traits: ['playful'] } }),
    } as unknown as CharacterRegistry;

    credentialStore = {
      hasApiKey: vi.fn().mockResolvedValue(false),
      getApiKey: vi.fn().mockResolvedValue(null),
      getMaskedKey: vi.fn().mockResolvedValue(null),
      saveApiKey: vi.fn().mockResolvedValue(undefined),
      removeApiKey: vi.fn().mockResolvedValue(undefined),
    } as unknown as CredentialStore;

    windowManager = {
      getPetWindow: () => null,
      getDashboardWindow: () => null,
    } as unknown as WindowManager;

    aiService = new AIService(
      settingsStore,
      characterRegistry,
      {} as any,
      {} as any,
      {} as any,
      windowManager,
      credentialStore,
      mockDb
    );
  });

  it('reports disabled status when AI is not configured', async () => {
    const status = await aiService.getStatus();
    expect(status.provider).toBe('disabled');
    expect(status.isConfigured).toBe(false);
    expect(status.status).toBe('not_configured');
  });

  it('provides helpful offline message when chatting with AI disabled', async () => {
    const res = await aiService.chat('Remind me to drink water in 20 minutes');
    expect(res.message.role).toBe('assistant');
    expect(res.message.content).toContain('Reminders tab');
    expect(res.message.content).toContain('disabled');
  });

  it('persists and retrieves messages across chat turns', async () => {
    await aiService.chat('Hello companion!');
    const messages = await aiService.getMessages();
    expect(messages.length).toBe(2); // 1 user + 1 assistant
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello companion!');
    expect(messages[1].role).toBe('assistant');
  });

  it('clears conversation history when requested', async () => {
    await aiService.chat('First message');
    expect((await aiService.getMessages()).length).toBe(2);

    await aiService.clearConversation();
    expect((await aiService.getMessages()).length).toBe(0);
  });
});
