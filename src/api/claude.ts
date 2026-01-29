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
  const languageInstruction = settings.language === 'zh-TW'
    ? '請使用繁體中文回應。'
    : 'Please respond in English.';

  return `你是一個 Obsidian 筆記助手。你的任務是幫助使用者處理他們的筆記內容。
${languageInstruction}
回應時請使用 Markdown 格式，以便在 Obsidian 中正確顯示。
保持回應簡潔、有條理。`;
}
