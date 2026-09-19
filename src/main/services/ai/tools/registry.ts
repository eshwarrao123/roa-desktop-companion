import { z } from 'zod';
import { ReminderEngine } from '../../reminder-engine';
import { TimerEngine } from '../../timer-engine';
import { SystemService } from '../../system-service';
import { SettingsStore } from '../../settings-store';
import { CharacterRegistry } from '../../character-registry';

export interface ToolContext {
  reminderEngine: ReminderEngine;
  timerEngine: TimerEngine;
  systemService: SystemService;
  settingsStore: SettingsStore;
  characterRegistry: CharacterRegistry;
}

export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  schema: z.ZodType<T>;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: T, context: ToolContext) => Promise<unknown>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  public register<T>(tool: ToolDefinition<T>): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Overwriting existing tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getFunctionDeclarations(): Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  }> {
    return this.getAll().map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  public async execute(
    name: string,
    rawArgs: unknown,
    context: ToolContext
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' is not in the allowlist.`,
      };
    }

    try {
      const parsedArgs = tool.schema.parse(rawArgs ?? {});
      const result = await tool.execute(parsedArgs, context);
      return {
        success: true,
        result,
      };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return {
          success: false,
          error: `Argument validation failed for '${name}': ${err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        };
      }
      return {
        success: false,
        error: `Execution error in '${name}': ${err?.message || String(err)}`,
      };
    }
  }
}
