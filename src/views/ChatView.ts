import {
  ItemView,
  WorkspaceLeaf,
  MarkdownRenderer,
  setIcon,
} from 'obsidian';
import type ClauwritePlugin from '../main';
import { getContext, replaceSelection, getActiveEditor } from '../utils/context';
import { createClaudeClient } from '../api/claude';
import { t } from '../i18n';

export const CHAT_VIEW_TYPE = 'clauwrite-chat-view';

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  showReplaceButton?: boolean;
}

export class ChatView extends ItemView {
  plugin: ClauwritePlugin;
  private messagesEl: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private contextIndicatorEl: HTMLElement;
  private loadingEl: HTMLElement;
  private loadingTextEl: HTMLElement;
  private messages: ChatMessage[] = [];
  private isLoading = false;
  private lastSelectionContent: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ClauwritePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t('chat.title');
  }

  getIcon(): string {
    return 'message-circle';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('clauwrite-chat-container');

    this.renderHeader(container);
    this.renderContextIndicator(container);
    this.renderMessages(container);
    this.renderInputArea(container);

    this.updateContextIndicator();
  }

  async onClose(): Promise<void> {
    this.messages = [];
  }

  private renderHeader(container: Element): void {
    const header = container.createDiv({ cls: 'clauwrite-header' });

    header.createSpan({ cls: 'clauwrite-header-title', text: t('chat.title') });

    const settingsIcon = header.createSpan({ cls: 'clauwrite-header-settings' });
    setIcon(settingsIcon, 'settings');
    settingsIcon.addEventListener('click', () => {
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById('clauwrite');
    });
  }

  private renderContextIndicator(container: Element): void {
    const contextDiv = container.createDiv({ cls: 'clauwrite-context' });
    this.contextIndicatorEl = contextDiv.createDiv({ cls: 'clauwrite-context-label' });
  }

  private renderMessages(container: Element): void {
    this.messagesEl = container.createDiv({ cls: 'clauwrite-messages' });

    // Loading indicator
    this.loadingEl = this.messagesEl.createDiv({ cls: 'clauwrite-loading' });
    this.loadingEl.style.display = 'none';

    const dotsContainer = this.loadingEl.createDiv({ cls: 'clauwrite-loading-dots' });
    dotsContainer.createSpan({ cls: 'clauwrite-loading-dot' });
    dotsContainer.createSpan({ cls: 'clauwrite-loading-dot' });
    dotsContainer.createSpan({ cls: 'clauwrite-loading-dot' });
    this.loadingTextEl = this.loadingEl.createSpan({ text: t('chat.thinking') });
  }

  private renderInputArea(container: Element): void {
    const inputArea = container.createDiv({ cls: 'clauwrite-input-area' });

    this.inputEl = inputArea.createEl('textarea', {
      cls: 'clauwrite-input',
      attr: { placeholder: t('chat.input.placeholder') },
    });

    this.inputEl.addEventListener('focus', () => {
      this.updateContextIndicator();
    });

    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.sendButton = inputArea.createEl('button', {
      cls: 'clauwrite-send-button',
      text: t('chat.send'),
    });

    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });
  }

  private updateContextIndicator(): void {
    const context = getContext(this.app);
    if (context) {
      const source = context.source === '選取內容' ? t('chat.context.selection') : context.source;
      this.contextIndicatorEl.setText(`${t('chat.context')}: ${source}`);
    } else {
      this.contextIndicatorEl.setText(`${t('chat.context')}: ${t('chat.context.none')}`);
    }
  }

  async sendMessage(): Promise<void> {
    const message = this.inputEl.value.trim();
    if (!message || this.isLoading) {
      return;
    }

    this.updateContextIndicator();

    this.inputEl.value = '';
    this.addMessage('user', message);

    const context = getContext(this.app);
    console.log('Clauwrite: sending with context:', context?.source || 'none');

    await this.sendToClaudeWithContext(message, context?.content);
  }

  async sendToClaudeWithContext(prompt: string, context?: string): Promise<void> {
    this.setLoading(true);

    try {
      const client = createClaudeClient(this.plugin.settings);
      const response = await client.sendMessage(prompt, context);
      this.addMessage('assistant', response);
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.addMessage('error', errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  async sendPromptWithContext(prompt: string, showReplaceButton = false): Promise<void> {
    this.addMessage('user', prompt);

    const context = getContext(this.app);

    // Store selection for replace functionality
    if (showReplaceButton && context?.source === '選取內容') {
      this.lastSelectionContent = context.content;
    }

    this.setLoading(true);

    try {
      const client = createClaudeClient(this.plugin.settings);
      const response = await client.sendMessage(prompt, context?.content);
      this.addMessage('assistant', response, showReplaceButton);
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.addMessage('error', errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  private addMessage(role: ChatMessage['role'], content: string, showReplaceButton = false): void {
    this.messages.push({ role, content, showReplaceButton });
    this.renderMessageList();
  }

  private renderMessageList(): void {
    // Clear all messages except loading indicator
    const children = Array.from(this.messagesEl.children);
    children.forEach((child) => {
      if (!child.hasClass('clauwrite-loading')) {
        child.remove();
      }
    });

    // Render all messages
    this.messages.forEach((msg) => {
      const messageEl = this.messagesEl.createDiv({
        cls: `clauwrite-message clauwrite-message-${msg.role}`,
      });

      const roleLabel = msg.role === 'user'
        ? t('chat.you')
        : msg.role === 'assistant'
          ? t('chat.claude')
          : t('chat.error');
      messageEl.createDiv({ cls: 'clauwrite-message-role', text: roleLabel });

      const contentEl = messageEl.createDiv({ cls: 'clauwrite-message-content' });

      if (msg.role === 'error') {
        contentEl.setText(msg.content);
      } else {
        MarkdownRenderer.renderMarkdown(
          msg.content,
          contentEl,
          '',
          this
        );
      }

      // Add replace button for assistant messages if needed
      if (msg.role === 'assistant' && msg.showReplaceButton && this.lastSelectionContent) {
        const replaceBtn = messageEl.createEl('button', {
          cls: 'clauwrite-replace-button',
          text: t('chat.replace'),
        });
        replaceBtn.addEventListener('click', () => {
          const editor = getActiveEditor(this.app);
          if (editor) {
            replaceSelection(editor, msg.content);
          }
        });
      }

      // Insert before loading indicator
      this.messagesEl.insertBefore(messageEl, this.loadingEl);
    });

    // Scroll to bottom
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.loadingEl.style.display = loading ? 'flex' : 'none';
    this.sendButton.disabled = loading;

    if (loading) {
      this.loadingTextEl.setText(t('chat.thinking'));
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }

  private extractErrorMessage(error: unknown): string {
    console.error('Clauwrite error:', error);

    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === 'string' && error) {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const msg = (error as { message: unknown }).message;
      if (typeof msg === 'string' && msg) {
        return msg;
      }
    }
    return t('error.unknown');
  }
}
