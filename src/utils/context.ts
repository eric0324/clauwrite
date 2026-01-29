import { App, Editor, MarkdownView } from 'obsidian';

export interface ContextResult {
  content: string;
  source: string;
}

/**
 * 取得最近的 MarkdownView，即使當前 active view 不是 MarkdownView
 */
function getMarkdownView(app: App): MarkdownView | null {
  // 先嘗試取得 active view
  const activeView = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeView) {
    return activeView;
  }

  // 遍歷所有 leaves 找 MarkdownView
  let markdownView: MarkdownView | null = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (!markdownView && leaf.view instanceof MarkdownView) {
      markdownView = leaf.view;
    }
  });

  return markdownView;
}

export function getActiveEditor(app: App): Editor | null {
  const view = getMarkdownView(app);
  if (!view) {
    return null;
  }
  return view.editor;
}

/**
 * 自動取得 context：有選取用選取，沒有就用整篇筆記
 */
export function getContext(app: App): ContextResult | null {
  const view = getMarkdownView(app);
  if (!view) {
    return null;
  }

  const editor = view.editor;
  const file = view.file;

  // 有選取就用選取
  const selection = editor.getSelection();
  if (selection) {
    return {
      content: selection,
      source: '選取內容',
    };
  }

  // 沒選取就用整篇筆記
  const content = editor.getValue();
  if (!content) {
    return null;
  }

  return {
    content,
    source: file?.basename || '當前筆記',
  };
}

export function replaceSelection(editor: Editor, newContent: string): void {
  const selection = editor.getSelection();
  if (!selection) {
    return;
  }
  editor.replaceSelection(newContent);
}
