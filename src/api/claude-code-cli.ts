import { spawn } from 'child_process';
import type { ClaudeClient } from './claude';
import type { ClauwriteSettings, ConversationMessage } from '../settings';
import { buildSystemPrompt } from './claude';

const CLI_TIMEOUT = 120000; // 120 seconds (2 minutes)

export class ClaudeCodeClient implements ClaudeClient {
  private settings: ClauwriteSettings;

  constructor(settings: ClauwriteSettings) {
    this.settings = settings;
  }

  async sendMessage(prompt: string, context?: string, history?: ConversationMessage[]): Promise<string> {
    return this.sendMessageStream(prompt, context, history || [], () => {});
  }

  async sendMessageStream(
    prompt: string,
    context: string | undefined,
    history: ConversationMessage[],
    onChunk: (chunk: string) => void,
    fileInfo?: { path?: string; fullContent?: string }
  ): Promise<string> {
    const systemPrompt = buildSystemPrompt(this.settings);

    // Build conversation history into prompt
    let historyText = '';
    if (history.length > 0) {
      historyText = '\n\n---\nPrevious conversation:\n';
      for (const msg of history) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        historyText += `${role}: ${msg.content}\n\n`;
      }
      historyText += '---\n\n';
    }

    // Add file info if available
    let fileInfoText = '';
    if (fileInfo?.path) {
      fileInfoText = `\n\nCurrent file: ${fileInfo.path}`;
      if (fileInfo.fullContent) {
        fileInfoText += `\n\nFull file content:\n\`\`\`\n${fileInfo.fullContent}\n\`\`\``;
      }
    }

    const fullPrompt = context
      ? `${systemPrompt}${historyText}${fileInfoText}\n\nUser request: ${prompt}\n\n---\n\nSelected content:\n${context}`
      : `${systemPrompt}${historyText}${fileInfoText}\n\n${prompt}`;

    const args = ['-p', fullPrompt, '--output-format', 'text'];

    if (this.settings.model !== 'claude-sonnet-4-20250514') {
      args.push('--model', this.settings.model);
    }

    return this.executeCommandStream(args, onChunk);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.executeCommandStream(['--version'], () => {}, 5000);
      return true;
    } catch {
      return false;
    }
  }

  private executeCommandStream(
    args: string[],
    onChunk: (chunk: string) => void,
    timeout: number = CLI_TIMEOUT
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const cliPath = this.settings.claudeCodePath || 'claude';

      console.debug('Clauwrite: Executing CLI command:', cliPath, args);

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = spawn(cliPath, args, {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (child.stdin) {
        child.stdin.end();
      }

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        reject(new Error('Request timed out'));
      }, timeout);

      child.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        onChunk(chunk);
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timeoutId);
        console.error('Clauwrite: spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('Cannot find claude command. Check installation or path settings.'));
        } else {
          reject(new Error(`Execution error: ${error.message}`));
        }
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        if (timedOut) {
          return;
        }

        if (code === 0) {
          resolve(stdout.trim());
        } else {
          const output = stderr || stdout;
          console.error('Claude CLI error output:', { code, stderr, stdout });
          const errorMessage = this.parseErrorMessage(output);
          reject(new Error(errorMessage || `CLI returned error code: ${code}`));
        }
      });
    });
  }

  private parseErrorMessage(output: string): string {
    const lowerOutput = output.toLowerCase();

    if (lowerOutput.includes('not authenticated') ||
        lowerOutput.includes('please login') ||
        lowerOutput.includes('authentication')) {
      return 'Claude Code not logged in. Please run `claude` to login first.';
    }

    if (lowerOutput.includes('command not found') ||
        lowerOutput.includes('not recognized')) {
      return 'Cannot find claude command. Check installation or path settings.';
    }

    if (output.trim()) {
      const firstLine = output.split('\n')[0].trim();
      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine;
    }

    return 'Error executing Claude Code CLI';
  }
}
