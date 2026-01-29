import { App, TFile, TFolder, normalizePath } from 'obsidian';

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
}

export interface ToolCall {
  tool: string;
  params: Record<string, string>;
}

export type AgentToolName = 'read_note' | 'write_note' | 'list_notes' | 'search_notes' | 'create_folder';

/**
 * Parse tool calls from Claude's response
 */
export function parseToolCalls(response: string): { toolCalls: ToolCall[]; cleanedResponse: string } {
  const toolPattern = /<<<TOOL:(\w+)>>>\n([\s\S]*?)<<<END_TOOL>>>/g;
  const toolCalls: ToolCall[] = [];
  let cleanedResponse = response;

  let match;
  while ((match = toolPattern.exec(response)) !== null) {
    const toolName = match[1];
    const paramBlock = match[2];
    const params = parseToolParams(paramBlock);
    toolCalls.push({ tool: toolName, params });
    cleanedResponse = cleanedResponse.replace(match[0], '');
  }

  return { toolCalls, cleanedResponse: cleanedResponse.trim() };
}

/**
 * Parse parameters from tool block content
 */
function parseToolParams(paramBlock: string): Record<string, string> {
  const params: Record<string, string> = {};
  const lines = paramBlock.split('\n');
  let currentKey = '';
  let currentValue: string[] = [];
  let isMultiline = false;

  for (const line of lines) {
    // Check if this line starts a new key
    const keyMatch = line.match(/^(\w+):\s*(.*)/);

    if (keyMatch && !isMultiline) {
      // Save previous key-value pair if exists
      if (currentKey) {
        params[currentKey] = currentValue.join('\n').trim();
      }

      currentKey = keyMatch[1];
      const value = keyMatch[2];

      // Check if this is a multiline value (empty after colon)
      if (value === '' || value === undefined) {
        isMultiline = true;
        currentValue = [];
      } else {
        currentValue = [value];
        isMultiline = false;
      }
    } else if (currentKey) {
      // Continue multiline value
      currentValue.push(line);
      isMultiline = true;
    }
  }

  // Save the last key-value pair
  if (currentKey) {
    params[currentKey] = currentValue.join('\n').trim();
  }

  return params;
}

/**
 * Execute agent tools using Obsidian Vault API
 */
export class AgentToolExecutor {
  constructor(private app: App) {}

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const { tool, params } = toolCall;

    switch (tool as AgentToolName) {
      case 'read_note':
        return this.readNote(params.path);
      case 'write_note':
        return this.writeNote(params.path, params.content);
      case 'list_notes':
        return this.listNotes(params.folder);
      case 'search_notes':
        return this.searchNotes(params.query);
      case 'create_folder':
        return this.createFolder(params.path);
      default:
        return { success: false, error: `Unknown tool: ${tool}` };
    }
  }

  /**
   * Read note content
   */
  private async readNote(path: string): Promise<ToolResult> {
    if (!path) {
      return { success: false, error: 'Path is required' };
    }

    const normalizedPath = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (!file) {
      return { success: false, error: `File not found: ${path}` };
    }

    if (!(file instanceof TFile)) {
      return { success: false, error: `Not a file: ${path}` };
    }

    try {
      const content = await this.app.vault.read(file);
      return { success: true, result: content };
    } catch (error) {
      return { success: false, error: `Failed to read file: ${error}` };
    }
  }

  /**
   * Write or create note
   */
  private async writeNote(path: string, content: string): Promise<ToolResult> {
    if (!path) {
      return { success: false, error: 'Path is required' };
    }
    if (content === undefined || content === null) {
      return { success: false, error: 'Content is required' };
    }

    const normalizedPath = normalizePath(path);

    // Ensure path ends with .md
    const finalPath = normalizedPath.endsWith('.md') ? normalizedPath : `${normalizedPath}.md`;

    try {
      const existingFile = this.app.vault.getAbstractFileByPath(finalPath);

      if (existingFile instanceof TFile) {
        // Update existing file
        await this.app.vault.modify(existingFile, content);
        return { success: true, result: `Updated: ${finalPath}` };
      } else {
        // Ensure parent folder exists
        const parentPath = finalPath.substring(0, finalPath.lastIndexOf('/'));
        if (parentPath) {
          await this.ensureFolderExists(parentPath);
        }
        // Create new file
        await this.app.vault.create(finalPath, content);
        return { success: true, result: `Created: ${finalPath}` };
      }
    } catch (error) {
      return { success: false, error: `Failed to write file: ${error}` };
    }
  }

  /**
   * List notes in folder
   */
  private async listNotes(folder?: string): Promise<ToolResult> {
    try {
      const files: string[] = [];
      const folderPath = folder ? normalizePath(folder) : '';

      if (folderPath) {
        const targetFolder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!targetFolder) {
          return { success: false, error: `Folder not found: ${folder}` };
        }
        if (!(targetFolder instanceof TFolder)) {
          return { success: false, error: `Not a folder: ${folder}` };
        }
        this.collectFilesFromFolder(targetFolder, files);
      } else {
        // List all files in vault
        const allFiles = this.app.vault.getMarkdownFiles();
        files.push(...allFiles.map(f => f.path));
      }

      if (files.length === 0) {
        return { success: true, result: 'No notes found.' };
      }

      return { success: true, result: files.join('\n') };
    } catch (error) {
      return { success: false, error: `Failed to list notes: ${error}` };
    }
  }

  /**
   * Recursively collect files from folder
   */
  private collectFilesFromFolder(folder: TFolder, files: string[]): void {
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === 'md') {
        files.push(child.path);
      } else if (child instanceof TFolder) {
        this.collectFilesFromFolder(child, files);
      }
    }
  }

  /**
   * Search notes by content
   */
  private async searchNotes(query: string): Promise<ToolResult> {
    if (!query) {
      return { success: false, error: 'Query is required' };
    }

    try {
      const results: string[] = [];
      const files = this.app.vault.getMarkdownFiles();
      const queryLower = query.toLowerCase();

      for (const file of files) {
        const content = await this.app.vault.cachedRead(file);
        if (content.toLowerCase().includes(queryLower)) {
          // Find matching lines for context
          const lines = content.split('\n');
          const matchingLines: string[] = [];

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(queryLower)) {
              matchingLines.push(`  Line ${i + 1}: ${lines[i].trim().substring(0, 100)}`);
              if (matchingLines.length >= 3) break; // Limit to 3 matches per file
            }
          }

          results.push(`${file.path}\n${matchingLines.join('\n')}`);
        }
      }

      if (results.length === 0) {
        return { success: true, result: `No notes found containing "${query}".` };
      }

      return { success: true, result: results.join('\n\n') };
    } catch (error) {
      return { success: false, error: `Failed to search notes: ${error}` };
    }
  }

  /**
   * Create folder
   */
  private async createFolder(path: string): Promise<ToolResult> {
    if (!path) {
      return { success: false, error: 'Path is required' };
    }

    try {
      await this.ensureFolderExists(normalizePath(path));
      return { success: true, result: `Folder created: ${path}` };
    } catch (error) {
      return { success: false, error: `Failed to create folder: ${error}` };
    }
  }

  /**
   * Ensure folder exists, creating it if necessary
   */
  private async ensureFolderExists(path: string): Promise<void> {
    const normalizedPath = normalizePath(path);
    const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (folder instanceof TFolder) {
      return; // Already exists
    }

    // Create folder (and parents if needed)
    await this.app.vault.createFolder(normalizedPath);
  }
}

/**
 * Build agentic system prompt with tool definitions
 */
export function buildAgenticSystemPrompt(basePrompt: string): string {
  const toolDocs = `
You have access to the following tools for working with notes in the vault:

## Available Tools

### read_note
Read the content of a note.
<<<TOOL:read_note>>>
path: path/to/note.md
<<<END_TOOL>>>

### write_note
Create or overwrite a note.
<<<TOOL:write_note>>>
path: path/to/note.md
content:
(note content here)
<<<END_TOOL>>>

### list_notes
List notes in a folder. If folder is omitted, lists all notes.
<<<TOOL:list_notes>>>
folder: path/to/folder
<<<END_TOOL>>>

### search_notes
Search for notes containing a query.
<<<TOOL:search_notes>>>
query: search term
<<<END_TOOL>>>

### create_folder
Create a new folder.
<<<TOOL:create_folder>>>
path: path/to/folder
<<<END_TOOL>>>

## Important Notes
- After using a tool, wait for the result before continuing.
- You can use multiple tools in one response if needed.
- Tool results will be provided in the next message.
- Always confirm with the user before making significant changes.
`;

  return `${basePrompt}\n\n${toolDocs}`;
}
