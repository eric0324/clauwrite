import { Notice } from 'obsidian';
import type ClauwritePlugin from '../main';
import { t } from '../i18n';

export function registerRewriteCommand(plugin: ClauwritePlugin): void {
  plugin.addCommand({
    id: 'rewrite',
    name: t('command.rewrite'),
    editorCallback: async (editor) => {
      const selection = editor.getSelection();

      if (!selection) {
        new Notice(t('notice.selectContent'));
        return;
      }

      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new Notice(t('notice.cannotOpenChat'));
        return;
      }

      await chatView.sendPromptWithContext(t('prompt.rewrite'), true);
    },
  });
}
