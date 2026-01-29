import type { ClaudeClient } from './claude';
import type { ClauwriteSettings, ConversationMessage } from '../settings';

/**
 * Claude Code CLI client
 *
 * Note: This client is disabled because Obsidian plugins cannot use Node.js
 * child_process module. Please use the API Key mode instead.
 */
export class ClaudeCodeClient implements ClaudeClient {
  constructor(_settings: ClauwriteSettings) {
    // Settings not used since CLI is disabled
  }

  async sendMessage(_prompt: string, _context?: string, _history?: ConversationMessage[]): Promise<string> {
    throw new Error('Claude Code CLI is not available in Obsidian plugins. Please use API Key mode in settings.');
  }

  async sendMessageStream(
    _prompt: string,
    _context: string | undefined,
    _history: ConversationMessage[],
    _onChunk: (chunk: string) => void
  ): Promise<string> {
    throw new Error('Claude Code CLI is not available in Obsidian plugins. Please use API Key mode in settings.');
  }

  async testConnection(): Promise<boolean> {
    // CLI is not available in Obsidian
    return false;
  }
}
