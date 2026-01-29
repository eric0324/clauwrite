import { App, Editor, MarkdownView } from 'obsidian';
import type { ContextMode } from '../settings';

export interface ContextResult {
  content: string;
  source: string;
}

export function getActiveEditor(app: App): Editor | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) {
    return null;
  }
  return view.editor;
}

export function getContext(app: App, mode: ContextMode): ContextResult | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) {
    return null;
  }

  const editor = view.editor;
  const file = view.file;

  if (mode === 'selection') {
    const selection = editor.getSelection();
    if (!selection) {
      return null;
    }
    return {
      content: selection,
      source: '選取內容',
    };
  }

  // mode === 'note'
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
