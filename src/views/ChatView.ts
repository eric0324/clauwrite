import {
  ItemView,
  WorkspaceLeaf,
  MarkdownRenderer,
  MarkdownView,
  setIcon,
  Notice,
} from 'obsidian';
import type ClauwritePlugin from '../main';
import type { ConversationMessage } from '../settings';
import { getContext, replaceSelection, getActiveEditor } from '../utils/context';
import { createClaudeClient, FileInfo } from '../api/claude';
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
  private streamingMessageEl: HTMLElement | null = null;
  private streamingContentEl: HTMLElement | null = null;
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

    // Load saved conversation history
    this.loadConversationHistory();
    this.updateContextIndicator();
  }

  async onClose(): Promise<void> {
    // Save conversation before closing
    await this.saveConversationHistory();
  }

  private renderHeader(container: Element): void {
    const header = container.createDiv({ cls: 'clauwrite-header' });

    header.createSpan({ cls: 'clauwrite-header-title', text: t('chat.title') });

    const actions = header.createDiv({ cls: 'clauwrite-header-actions' });

    // New chat button
    const newChatIcon = actions.createSpan({ cls: 'clauwrite-header-icon' });
    setIcon(newChatIcon, 'plus');
    newChatIcon.setAttribute('aria-label', t('chat.newChat'));
    newChatIcon.addEventListener('click', () => {
      this.clearConversation();
    });

    // Settings button
    const settingsIcon = actions.createSpan({ cls: 'clauwrite-header-icon' });
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
      if (e.key === 'Enter' && !e.shiftKey) {
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

  private loadConversationHistory(): void {
    const history = this.plugin.settings.conversationHistory;
    this.messages = history.map(msg => ({
      role: msg.role,
      content: msg.content,
      showReplaceButton: false,
    }));
    this.renderMessageList();
  }

  private async saveConversationHistory(): Promise<void> {
    // Convert messages to ConversationMessage format (exclude errors)
    const history: ConversationMessage[] = this.messages
      .filter(msg => msg.role !== 'error')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: Date.now(),
      }));

    // Limit history length
    const maxLength = this.plugin.settings.maxHistoryLength;
    if (history.length > maxLength) {
      history.splice(0, history.length - maxLength);
    }

    this.plugin.settings.conversationHistory = history;
    await this.plugin.saveSettings();
  }

  private async clearConversation(): Promise<void> {
    this.messages = [];
    this.plugin.settings.conversationHistory = [];
    await this.plugin.saveSettings();
    this.renderMessageList();
  }

  private getConversationHistory(): ConversationMessage[] {
    return this.messages
      .filter(msg => msg.role !== 'error')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: Date.now(),
      }));
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
    const history = this.getConversationHistory().slice(0, -1); // Exclude the message we just added

    // Prepare file info for Claude to edit
    const fileInfo: FileInfo | undefined = context?.filePath ? {
      path: context.filePath,
      fullContent: context.fullContent,
    } : undefined;

    await this.sendToClaudeStream(message, context?.content, history, false, fileInfo);
  }

  async sendToClaudeStream(
    prompt: string,
    context?: string,
    history?: ConversationMessage[],
    showReplaceButton = false,
    fileInfo?: FileInfo
  ): Promise<void> {
    this.setLoading(true);
    this.startStreamingMessage();

    let fullResponse = '';

    try {
      const client = createClaudeClient(this.plugin.settings);
      fullResponse = await client.sendMessageStream(prompt, context, history || [], (chunk) => {
        this.updateStreamingMessage(chunk);
      }, fileInfo);

      // Parse edit blocks from response
      const { displayContent, editContent } = this.parseEditBlocks(fullResponse);

      // Apply edit if present
      if (editContent) {
        await this.applyEditToFile(editContent);
      }

      // Display the response (without edit blocks)
      const contentToDisplay = displayContent || fullResponse;
      this.finishStreamingMessage(contentToDisplay, showReplaceButton);

      // Save conversation after successful response
      await this.saveConversationHistory();
    } catch (error) {
      this.cancelStreamingMessage();
      const errorMessage = this.extractErrorMessage(error);
      this.addMessage('error', errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  async sendPromptWithContext(prompt: string, showReplaceButton = false): Promise<void> {
    this.addMessage('user', prompt);

    const context = getContext(this.app);

    if (showReplaceButton && context?.source === '選取內容') {
      this.lastSelectionContent = context.content;
    }

    const history = this.getConversationHistory().slice(0, -1);

    // Prepare file info for Claude to edit
    const fileInfo: FileInfo | undefined = context?.filePath ? {
      path: context.filePath,
      fullContent: context.fullContent,
    } : undefined;

    await this.sendToClaudeStream(prompt, context?.content, history, showReplaceButton, fileInfo);
  }

  private startStreamingMessage(): void {
    this.streamingMessageEl = this.messagesEl.createDiv({
      cls: 'clauwrite-message clauwrite-message-assistant clauwrite-message-streaming',
    });

    this.streamingMessageEl.createDiv({ cls: 'clauwrite-message-role', text: t('chat.claude') });
    this.streamingContentEl = this.streamingMessageEl.createDiv({ cls: 'clauwrite-message-content' });

    this.messagesEl.insertBefore(this.streamingMessageEl, this.loadingEl);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private updateStreamingMessage(chunk: string): void {
    if (!this.streamingContentEl) return;

    const currentText = this.streamingContentEl.getText() + chunk;
    this.streamingContentEl.setText(currentText);

    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private finishStreamingMessage(finalContent: string, showReplaceButton: boolean): void {
    if (!this.streamingMessageEl || !this.streamingContentEl) return;

    this.streamingMessageEl.removeClass('clauwrite-message-streaming');

    this.streamingContentEl.empty();
    MarkdownRenderer.renderMarkdown(
      finalContent,
      this.streamingContentEl,
      '',
      this
    );

    if (showReplaceButton && this.lastSelectionContent) {
      const replaceBtn = this.streamingMessageEl.createEl('button', {
        cls: 'clauwrite-replace-button',
        text: t('chat.replace'),
      });
      const content = finalContent;
      replaceBtn.addEventListener('click', () => {
        const editor = getActiveEditor(this.app);
        if (editor) {
          replaceSelection(editor, content);
        }
      });
    }

    this.messages.push({ role: 'assistant', content: finalContent, showReplaceButton });

    this.streamingMessageEl = null;
    this.streamingContentEl = null;
  }

  private cancelStreamingMessage(): void {
    if (this.streamingMessageEl) {
      this.streamingMessageEl.remove();
      this.streamingMessageEl = null;
      this.streamingContentEl = null;
    }
  }

  private addMessage(role: ChatMessage['role'], content: string, showReplaceButton = false): void {
    this.messages.push({ role, content, showReplaceButton });
    this.renderMessageList();
  }

  private renderMessageList(): void {
    const children = Array.from(this.messagesEl.children);
    children.forEach((child) => {
      if (!child.hasClass('clauwrite-loading') && !child.hasClass('clauwrite-message-streaming')) {
        child.remove();
      }
    });

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

      this.messagesEl.insertBefore(messageEl, this.loadingEl);
    });

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

  /**
   * Parse edit blocks from Claude's response
   */
  private parseEditBlocks(response: string): { displayContent: string; editContent: string | null } {
    const editPattern = /<<<APPLY_EDIT>>>\n?([\s\S]*?)\n?<<<END_EDIT>>>/g;
    const matches = [...response.matchAll(editPattern)];

    if (matches.length === 0) {
      return { displayContent: response, editContent: null };
    }

    // Extract the edit content (use the last match if multiple)
    const editContent = matches[matches.length - 1][1].trim();

    // Remove edit blocks from display content
    const displayContent = response.replace(editPattern, '').trim();

    return { displayContent, editContent };
  }

  /**
   * Apply edit to the current file
   */
  private async applyEditToFile(newContent: string): Promise<boolean> {
    // Find the active markdown view
    let markdownView: MarkdownView | null = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (!markdownView) {
      // Try to find any markdown view
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (!markdownView && leaf.view instanceof MarkdownView) {
          markdownView = leaf.view;
        }
      });
    }

    if (!markdownView || !markdownView.file) {
      new Notice(t('error.noActiveFile'));
      return false;
    }

    try {
      await this.app.vault.modify(markdownView.file, newContent);
      new Notice(t('chat.fileUpdated'));
      return true;
    } catch (error) {
      console.error('Failed to apply edit:', error);
      new Notice(t('error.editFailed'));
      return false;
    }
  }
}
