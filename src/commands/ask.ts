import { Modal, App, Notice, Setting } from 'obsidian';
import type ClauwritePlugin from '../main';
import { getContext } from '../utils/context';

class AskModal extends Modal {
  private plugin: ClauwritePlugin;
  private question = '';

  constructor(app: App, plugin: ClauwritePlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('clauwrite-ask-modal');

    contentEl.createEl('h3', { text: '詢問關於當前內容' });

    const textArea = contentEl.createEl('textarea', {
      attr: { placeholder: '輸入您的問題...' },
    });
    textArea.addEventListener('input', () => {
      this.question = textArea.value;
    });
    textArea.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.submitQuestion();
      }
    });

    const buttonContainer = contentEl.createDiv({ cls: 'clauwrite-ask-modal-buttons' });

    const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    const submitBtn = buttonContainer.createEl('button', {
      text: '送出',
      cls: 'mod-cta',
    });
    submitBtn.addEventListener('click', () => {
      this.submitQuestion();
    });

    // Focus the textarea
    setTimeout(() => textArea.focus(), 10);
  }

  private async submitQuestion(): Promise<void> {
    if (!this.question.trim()) {
      new Notice('請輸入問題');
      return;
    }

    this.close();

    const chatView = await this.plugin.activateChatView();
    if (!chatView) {
      new Notice('無法開啟對話視窗');
      return;
    }

    const context = getContext(this.plugin.app, this.plugin.settings.contextMode);
    const prompt = `根據以下內容回答問題。\n\n問題：${this.question.trim()}`;

    await chatView.sendPromptWithContext(prompt);
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export function registerAskCommand(plugin: ClauwritePlugin): void {
  plugin.addCommand({
    id: 'ask',
    name: '詢問關於當前內容',
    callback: async () => {
      const context = getContext(plugin.app, plugin.settings.contextMode);

      if (!context) {
        new Notice('請先開啟筆記或選取內容');
        return;
      }

      new AskModal(plugin.app, plugin).open();
    },
  });
}
