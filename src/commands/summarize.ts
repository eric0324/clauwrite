import { Notice } from 'obsidian';
import type ClauwritePlugin from '../main';
import { getContext } from '../utils/context';
import { t } from '../i18n';

export function registerSummarizeCommand(plugin: ClauwritePlugin): void {
  plugin.addCommand({
    id: 'summarize',
    name: t('command.summarize'),
    callback: async () => {
      const context = getContext(plugin.app);

      if (!context) {
        new Notice(t('notice.openNote'));
        return;
      }

      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new Notice(t('notice.cannotOpenChat'));
        return;
      }

      await chatView.sendPromptWithContext(t('prompt.summarize'));
    },
  });
}
