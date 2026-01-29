import { requestUrl, RequestUrlParam } from 'obsidian';
import type { ClaudeClient } from './claude';
import type { ClauwriteSettings } from '../settings';
import { buildSystemPrompt } from './claude';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
}

interface AnthropicResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  error?: {
    type: string;
    message: string;
  };
}

export class AnthropicApiClient implements ClaudeClient {
  private settings: ClauwriteSettings;
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(settings: ClauwriteSettings) {
    this.settings = settings;
  }

  async sendMessageStream(
    prompt: string,
    context: string | undefined,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    // API mode doesn't support streaming with Obsidian's requestUrl
    // Fall back to regular request and emit full response at once
    const response = await this.sendMessage(prompt, context);
    onChunk(response);
    return response;
  }

  async sendMessage(prompt: string, context?: string): Promise<string> {
    if (!this.settings.apiKey) {
      throw new Error('API Key 未設定，請在設定中輸入您的 Anthropic API Key');
    }

    const systemPrompt = buildSystemPrompt(this.settings);
    const userContent = context
      ? `${prompt}\n\n---\n\n${context}`
      : prompt;

    const requestBody: AnthropicRequest = {
      model: this.settings.model,
      max_tokens: this.settings.maxTokens,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      system: systemPrompt,
    };

    const requestParams: RequestUrlParam = {
      url: this.baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    };

    try {
      const response = await requestUrl(requestParams);
      const data = response.json as AnthropicResponse;

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (!data.content || data.content.length === 0) {
        throw new Error('回應內容為空');
      }

      return data.content[0].text;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.settings.apiKey) {
      throw new Error('API Key 未設定');
    }

    try {
      // Send a minimal request to verify the API key
      const requestBody: AnthropicRequest = {
        model: this.settings.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
      };

      const requestParams: RequestUrlParam = {
        url: this.baseUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.settings.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      };

      const response = await requestUrl(requestParams);
      return response.status === 200;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      // Check for specific HTTP status codes
      const message = error.message.toLowerCase();

      if (message.includes('401') || message.includes('unauthorized')) {
        return new Error('API Key 無效，請在設定中檢查');
      }

      if (message.includes('429') || message.includes('rate')) {
        return new Error('請求過於頻繁，請稍後再試');
      }

      if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return new Error('伺服器錯誤，請稍後再試');
      }

      if (message.includes('network') || message.includes('fetch') || message.includes('econnrefused')) {
        return new Error('網路連線失敗，請檢查網路');
      }

      return error;
    }

    return new Error('發生未知錯誤');
  }
}
