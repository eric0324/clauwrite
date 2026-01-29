import type { ClauwriteSettings, ConversationMessage } from '../settings';
import { AnthropicApiClient } from './anthropic-api';
import { ClaudeCodeClient } from './claude-code-cli';

export interface FileInfo {
  path?: string;
  fullContent?: string;
}

export interface ClaudeClient {
  sendMessage(prompt: string, context?: string, history?: ConversationMessage[]): Promise<string>;
  sendMessageStream(
    prompt: string,
    context: string | undefined,
    history: ConversationMessage[],
    onChunk: (chunk: string) => void,
    fileInfo?: FileInfo
  ): Promise<string>;
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

  return `${settings.prompts.system}\n${langInstruction}`;
}
