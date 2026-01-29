import { Notice } from 'obsidian';
import type ClauwritePlugin from '../main';
import { getActiveEditor } from '../utils/context';

export function registerRewriteCommand(plugin: ClauwritePlugin): void {
  plugin.addCommand({
    id: 'rewrite',
    name: '改寫選取內容',
    editorCallback: async (editor) => {
      const selection = editor.getSelection();

      if (!selection) {
        new Notice('請先選取要改寫的內容');
        return;
      }

      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new Notice('無法開啟對話視窗');
        return;
      }

      // Set context mode to selection for this operation
      chatView.setContextMode('selection');

      const prompt = '請改寫以下內容，使其更清晰易讀，保持原意：';
      await chatView.sendPromptWithContext(prompt, true); // showReplaceButton = true
    },
  });
}
