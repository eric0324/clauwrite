import type { ClauwriteSettings } from '../settings';
import { AnthropicApiClient } from './anthropic-api';
import { ClaudeCodeClient } from './claude-code-cli';

export interface ClaudeClient {
  sendMessage(prompt: string, context?: string): Promise<string>;
  testConnection(): Promise<boolean>;
}

export function createClaudeClient(settings: ClauwriteSettings): ClaudeClient {
  if (settings.authMode === 'api-key') {
    return new AnthropicApiClient(settings);
  }
  return new ClaudeCodeClient(settings);
}

export function buildSystemPrompt(settings: ClauwriteSettings): string {
  const langInstruction = settings.responseLanguage === 'zh-TW'
    ? 'Respond in Traditional Chinese (繁體中文).'
    : 'Respond in English.';

  return `You are an Obsidian note assistant. Help users with their notes.
${langInstruction}
Use Markdown formatting. Keep responses concise and well-organized.`;
}
