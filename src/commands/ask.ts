import { Modal, App, Notice } from 'obsidian';
import type ClauwritePlugin from '../main';
import { getContext } from '../utils/context';
import { t } from '../i18n';

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

    contentEl.createEl('h3', { text: t('prompt.askModal.title') });

    const textArea = contentEl.createEl('textarea', {
      attr: { placeholder: t('prompt.askModal.placeholder') },
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

    const cancelBtn = buttonContainer.createEl('button', { text: t('prompt.askModal.cancel') });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    const submitBtn = buttonContainer.createEl('button', {
      text: t('prompt.askModal.submit'),
      cls: 'mod-cta',
    });
    submitBtn.addEventListener('click', () => {
      this.submitQuestion();
    });

    setTimeout(() => textArea.focus(), 10);
  }

  private async submitQuestion(): Promise<void> {
    if (!this.question.trim()) {
      new Notice(t('notice.enterQuestion'));
      return;
    }

    this.close();

    const chatView = await this.plugin.activateChatView();
    if (!chatView) {
      new Notice(t('notice.cannotOpenChat'));
      return;
    }

    const prompt = this.plugin.settings.prompts.ask.replace('{{question}}', this.question.trim());

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
    name: t('command.ask'),
    callback: async () => {
      const context = getContext(plugin.app);

      if (!context) {
        new Notice(t('notice.openNote'));
        return;
      }

      new AskModal(plugin.app, plugin).open();
    },
  });
}
