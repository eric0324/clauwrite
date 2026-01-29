import { Notice } from 'obsidian';
import type ClauwritePlugin from '../main';
import { getContext } from '../utils/context';

export function registerSummarizeCommand(plugin: ClauwritePlugin): void {
  plugin.addCommand({
    id: 'summarize',
    name: '摘要當前內容',
    callback: async () => {
      const context = getContext(plugin.app, plugin.settings.contextMode);

      if (!context) {
        new Notice('請先開啟筆記或選取內容');
        return;
      }

      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new Notice('無法開啟對話視窗');
        return;
      }

      const prompt = '請為以下內容產生簡潔的摘要：';
      await chatView.sendPromptWithContext(prompt);
    },
  });
}
