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
    const systemPrompt = buildSystemPrompt(this.settings);
    const fullPrompt = context
      ? `${systemPrompt}\n\n---\n\n使用者問題：${prompt}\n\n---\n\n相關內容：\n${context}`
      : `${systemPrompt}\n\n---\n\n${prompt}`;

    const args = ['-p', fullPrompt, '--output-format', 'text'];

    if (this.settings.model !== 'claude-sonnet-4-20250514') {
      args.push('--model', this.settings.model);
    }

    return this.executeCommand(args);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.executeCommand(['--version'], 5000);
      return true;
    } catch {
      return false;
    }
  }

  private executeCommand(args: string[], timeout: number = CLI_TIMEOUT): Promise<string> {
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

      // 關閉 stdin，讓 CLI 知道沒有更多輸入
      if (child.stdin) {
        child.stdin.end();
      }

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        reject(new Error('請求逾時，請稍後再試'));
      }, timeout);

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        console.log('Clauwrite: stdout chunk received, length:', data.length);
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        console.log('Clauwrite: stderr chunk:', data.toString());
      });

      child.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timeoutId);
        console.error('Clauwrite: spawn error:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 claude 命令，請確認已安裝 Claude Code 或檢查路徑設定'));
        } else {
          reject(new Error(`執行錯誤: ${error.message}`));
        }
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        console.log('Clauwrite: CLI process closed with code:', code);

        if (timedOut) {
          return;
        }

        if (code === 0) {
          resolve(stdout.trim());
        } else {
          const output = stderr || stdout;
          console.error('Claude CLI error output:', { code, stderr, stdout });
          const errorMessage = this.parseErrorMessage(output);
          reject(new Error(errorMessage || `CLI 返回錯誤碼: ${code}`));
        }
      });
    });
  }

  private parseErrorMessage(output: string): string {
    const lowerOutput = output.toLowerCase();

    if (lowerOutput.includes('not authenticated') ||
        lowerOutput.includes('please login') ||
        lowerOutput.includes('authentication')) {
      return 'Claude Code 尚未登入，請先執行 `claude` 完成登入';
    }

    if (lowerOutput.includes('command not found') ||
        lowerOutput.includes('not recognized')) {
      return '找不到 claude 命令，請確認已安裝 Claude Code 或檢查路徑設定';
    }

    if (output.trim()) {
      // Return the first line of error output
      const firstLine = output.split('\n')[0].trim();
      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine;
    }

    return '執行 Claude Code CLI 時發生錯誤';
  }
}
