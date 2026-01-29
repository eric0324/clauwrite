import { spawn } from 'child_process';
import type { ClaudeClient } from './claude';
import type { ClauwriteSettings } from '../settings';
import { buildSystemPrompt } from './claude';

const CLI_TIMEOUT = 120000; // 120 seconds (2 minutes)

export class ClaudeCodeClient implements ClaudeClient {
  private settings: ClauwriteSettings;

  constructor(settings: ClauwriteSettings) {
    this.settings = settings;
  }

  async sendMessage(prompt: string, context?: string): Promise<string> {
    return this.sendMessageStream(prompt, context, () => {});
  }

  async sendMessageStream(
    prompt: string,
    context: string | undefined,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const systemPrompt = buildSystemPrompt(this.settings);
    const fullPrompt = context
      ? `${systemPrompt}\n\n---\n\nUser request: ${prompt}\n\n---\n\nContent:\n${context}`
      : `${systemPrompt}\n\n---\n\n${prompt}`;

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

      console.log('Clauwrite: Executing CLI command:', cliPath, args);

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
