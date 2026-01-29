import { requestUrl, RequestUrlParam } from 'obsidian';
import type { ClaudeClient, FileInfo } from './claude';
import type { ClauwriteSettings, ConversationMessage } from '../settings';
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
    history: ConversationMessage[],
    onChunk: (chunk: string) => void,
    fileInfo?: FileInfo
  ): Promise<string> {
    // API mode doesn't support streaming with Obsidian's requestUrl
    // Fall back to regular request and emit full response at once
    const response = await this.sendMessage(prompt, context, history, fileInfo);
    onChunk(response);
    return response;
  }

  async sendMessage(prompt: string, context?: string, history?: ConversationMessage[], fileInfo?: FileInfo): Promise<string> {
    if (!this.settings.apiKey) {
      throw new Error('API Key not set. Please enter your Anthropic API Key in settings.');
    }

    const systemPrompt = buildSystemPrompt(this.settings);

    // Add file info if available
    let fileInfoText = '';
    if (fileInfo?.path) {
      fileInfoText = `\n\nCurrent file: ${fileInfo.path}`;
      if (fileInfo.fullContent) {
        fileInfoText += `\n\nFull file content:\n\`\`\`\n${fileInfo.fullContent}\n\`\`\``;
      }
    }

    const userContent = context
      ? `${prompt}${fileInfoText}\n\n---\n\nSelected content:\n${context}`
      : `${prompt}${fileInfoText}`;

    // Build messages array with history
    const messages: AnthropicMessage[] = [];

    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    messages.push({
      role: 'user',
      content: userContent,
    });

    const requestBody: AnthropicRequest = {
      model: this.settings.model,
      max_tokens: this.settings.maxTokens,
      messages,
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
        throw new Error('Empty response');
      }

      return data.content[0].text;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.settings.apiKey) {
      throw new Error('API Key not set');
    }

    try {
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
      const message = error.message.toLowerCase();

      if (message.includes('401') || message.includes('unauthorized')) {
        return new Error('Invalid API Key. Please check settings.');
      }

      if (message.includes('429') || message.includes('rate')) {
        return new Error('Rate limited. Please try again later.');
      }

      if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return new Error('Server error. Please try again later.');
      }

      if (message.includes('network') || message.includes('fetch') || message.includes('econnrefused')) {
        return new Error('Network connection failed. Please check your internet.');
      }

      return error;
    }

    return new Error('Unknown error occurred');
  }
}
