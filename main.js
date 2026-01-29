var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ClauwritePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian9 = require("obsidian");

// src/settings.ts
var import_obsidian3 = require("obsidian");

// src/api/anthropic-api.ts
var import_obsidian = require("obsidian");
var AnthropicApiClient = class {
  constructor(settings) {
    this.baseUrl = "https://api.anthropic.com/v1/messages";
    this.settings = settings;
  }
  async sendMessageStream(prompt, context, history, onChunk, fileInfo) {
    const response = await this.sendMessage(prompt, context, history, fileInfo);
    onChunk(response);
    return response;
  }
  async sendMessage(prompt, context, history, fileInfo) {
    if (!this.settings.apiKey) {
      throw new Error("API Key not set. Please enter your Anthropic API Key in settings.");
    }
    const systemPrompt = buildSystemPrompt(this.settings);
    let fileInfoText = "";
    if (fileInfo == null ? void 0 : fileInfo.path) {
      fileInfoText = `

Current file: ${fileInfo.path}`;
      if (fileInfo.fullContent) {
        fileInfoText += `

Full file content:
\`\`\`
${fileInfo.fullContent}
\`\`\``;
      }
    }
    const userContent = context ? `${prompt}${fileInfoText}

---

Selected content:
${context}` : `${prompt}${fileInfoText}`;
    const messages = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    messages.push({
      role: "user",
      content: userContent
    });
    const requestBody = {
      model: this.settings.model,
      max_tokens: this.settings.maxTokens,
      messages,
      system: systemPrompt
    };
    const requestParams = {
      url: this.baseUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.settings.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody)
    };
    try {
      const response = await (0, import_obsidian.requestUrl)(requestParams);
      const data = response.json;
      if (data.error) {
        throw new Error(data.error.message);
      }
      if (!data.content || data.content.length === 0) {
        throw new Error("Empty response");
      }
      return data.content[0].text;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  async testConnection() {
    if (!this.settings.apiKey) {
      throw new Error("API Key not set");
    }
    try {
      const requestBody = {
        model: this.settings.model,
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Hi"
          }
        ]
      };
      const requestParams = {
        url: this.baseUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.settings.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(requestBody)
      };
      const response = await (0, import_obsidian.requestUrl)(requestParams);
      return response.status === 200;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  handleError(error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("401") || message.includes("unauthorized")) {
        return new Error("Invalid API Key. Please check settings.");
      }
      if (message.includes("429") || message.includes("rate")) {
        return new Error("Rate limited. Please try again later.");
      }
      if (message.includes("500") || message.includes("502") || message.includes("503")) {
        return new Error("Server error. Please try again later.");
      }
      if (message.includes("network") || message.includes("fetch") || message.includes("econnrefused")) {
        return new Error("Network connection failed. Please check your internet.");
      }
      return error;
    }
    return new Error("Unknown error occurred");
  }
};

// src/api/claude-code-cli.ts
var import_child_process = require("child_process");
var CLI_TIMEOUT = 12e4;
var ClaudeCodeClient = class {
  constructor(settings) {
    this.settings = settings;
  }
  async sendMessage(prompt, context, history) {
    return this.sendMessageStream(prompt, context, history || [], () => {
    });
  }
  async sendMessageStream(prompt, context, history, onChunk, fileInfo) {
    const systemPrompt = buildSystemPrompt(this.settings);
    let historyText = "";
    if (history.length > 0) {
      historyText = "\n\n---\nPrevious conversation:\n";
      for (const msg of history) {
        const role = msg.role === "user" ? "User" : "Assistant";
        historyText += `${role}: ${msg.content}

`;
      }
      historyText += "---\n\n";
    }
    let fileInfoText = "";
    if (fileInfo == null ? void 0 : fileInfo.path) {
      fileInfoText = `

Current file: ${fileInfo.path}`;
      if (fileInfo.fullContent) {
        fileInfoText += `

Full file content:
\`\`\`
${fileInfo.fullContent}
\`\`\``;
      }
    }
    const fullPrompt = context ? `${systemPrompt}${historyText}${fileInfoText}

User request: ${prompt}

---

Selected content:
${context}` : `${systemPrompt}${historyText}${fileInfoText}

${prompt}`;
    const args = ["-p", fullPrompt, "--output-format", "text"];
    if (this.settings.model !== "claude-sonnet-4-20250514") {
      args.push("--model", this.settings.model);
    }
    return this.executeCommandStream(args, onChunk);
  }
  async testConnection() {
    try {
      await this.executeCommandStream(["--version"], () => {
      }, 5e3);
      return true;
    } catch (e) {
      return false;
    }
  }
  executeCommandStream(args, onChunk, timeout = CLI_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const cliPath = this.settings.claudeCodePath || "claude";
      console.debug("Clauwrite: Executing CLI command:", cliPath, args);
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const child = (0, import_child_process.spawn)(cliPath, args, {
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"]
      });
      if (child.stdin) {
        child.stdin.end();
      }
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        reject(new Error("Request timed out"));
      }, timeout);
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
        onChunk(chunk);
      });
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      child.on("error", (error) => {
        clearTimeout(timeoutId);
        console.error("Clauwrite: spawn error:", error);
        if (error.code === "ENOENT") {
          reject(new Error("Cannot find claude command. Check installation or path settings."));
        } else {
          reject(new Error(`Execution error: ${error.message}`));
        }
      });
      child.on("close", (code) => {
        clearTimeout(timeoutId);
        if (timedOut) {
          return;
        }
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          const output = stderr || stdout;
          console.error("Claude CLI error output:", { code, stderr, stdout });
          const errorMessage = this.parseErrorMessage(output);
          reject(new Error(errorMessage || `CLI returned error code: ${code}`));
        }
      });
    });
  }
  parseErrorMessage(output) {
    const lowerOutput = output.toLowerCase();
    if (lowerOutput.includes("not authenticated") || lowerOutput.includes("please login") || lowerOutput.includes("authentication")) {
      return "Claude Code not logged in. Please run `claude` to login first.";
    }
    if (lowerOutput.includes("command not found") || lowerOutput.includes("not recognized")) {
      return "Cannot find claude command. Check installation or path settings.";
    }
    if (output.trim()) {
      const firstLine = output.split("\n")[0].trim();
      return firstLine.length > 200 ? firstLine.substring(0, 200) + "..." : firstLine;
    }
    return "Error executing Claude Code CLI";
  }
};

// src/utils/agent-tools.ts
var import_obsidian2 = require("obsidian");
function parseToolCalls(response) {
  const toolPattern = /<<<TOOL:(\w+)>>>\n([\s\S]*?)<<<END_TOOL>>>/g;
  const toolCalls = [];
  let cleanedResponse = response;
  let match;
  while ((match = toolPattern.exec(response)) !== null) {
    const toolName = match[1];
    const paramBlock = match[2];
    const params = parseToolParams(paramBlock);
    toolCalls.push({ tool: toolName, params });
    cleanedResponse = cleanedResponse.replace(match[0], "");
  }
  return { toolCalls, cleanedResponse: cleanedResponse.trim() };
}
function parseToolParams(paramBlock) {
  const params = {};
  const lines = paramBlock.split("\n");
  let currentKey = "";
  let currentValue = [];
  let isMultiline = false;
  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(.*)/);
    if (keyMatch && !isMultiline) {
      if (currentKey) {
        params[currentKey] = currentValue.join("\n").trim();
      }
      currentKey = keyMatch[1];
      const value = keyMatch[2];
      if (value === "" || value === void 0) {
        isMultiline = true;
        currentValue = [];
      } else {
        currentValue = [value];
        isMultiline = false;
      }
    } else if (currentKey) {
      currentValue.push(line);
      isMultiline = true;
    }
  }
  if (currentKey) {
    params[currentKey] = currentValue.join("\n").trim();
  }
  return params;
}
var AgentToolExecutor = class {
  constructor(app) {
    this.app = app;
  }
  async execute(toolCall) {
    const { tool, params } = toolCall;
    switch (tool) {
      case "read_note":
        return this.readNote(params.path);
      case "write_note":
        return this.writeNote(params.path, params.content);
      case "list_notes":
        return this.listNotes(params.folder);
      case "search_notes":
        return this.searchNotes(params.query);
      case "create_folder":
        return this.createFolder(params.path);
      default:
        return { success: false, error: `Unknown tool: ${tool}` };
    }
  }
  /**
   * Read note content
   */
  async readNote(path) {
    if (!path) {
      return { success: false, error: "Path is required" };
    }
    const normalizedPath = (0, import_obsidian2.normalizePath)(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);
    if (!file) {
      return { success: false, error: `File not found: ${path}` };
    }
    if (!(file instanceof import_obsidian2.TFile)) {
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
  async writeNote(path, content) {
    if (!path) {
      return { success: false, error: "Path is required" };
    }
    if (content === void 0 || content === null) {
      return { success: false, error: "Content is required" };
    }
    const normalizedPath = (0, import_obsidian2.normalizePath)(path);
    const finalPath = normalizedPath.endsWith(".md") ? normalizedPath : `${normalizedPath}.md`;
    try {
      const existingFile = this.app.vault.getAbstractFileByPath(finalPath);
      if (existingFile instanceof import_obsidian2.TFile) {
        await this.app.vault.modify(existingFile, content);
        return { success: true, result: `Updated: ${finalPath}` };
      } else {
        const parentPath = finalPath.substring(0, finalPath.lastIndexOf("/"));
        if (parentPath) {
          await this.ensureFolderExists(parentPath);
        }
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
  listNotes(folder) {
    try {
      const files = [];
      const folderPath = folder ? (0, import_obsidian2.normalizePath)(folder) : "";
      if (folderPath) {
        const targetFolder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!targetFolder) {
          return { success: false, error: `Folder not found: ${folder}` };
        }
        if (!(targetFolder instanceof import_obsidian2.TFolder)) {
          return { success: false, error: `Not a folder: ${folder}` };
        }
        this.collectFilesFromFolder(targetFolder, files);
      } else {
        const allFiles = this.app.vault.getMarkdownFiles();
        files.push(...allFiles.map((f) => f.path));
      }
      if (files.length === 0) {
        return { success: true, result: "No notes found." };
      }
      return { success: true, result: files.join("\n") };
    } catch (error) {
      return { success: false, error: `Failed to list notes: ${error}` };
    }
  }
  /**
   * Recursively collect files from folder
   */
  collectFilesFromFolder(folder, files) {
    for (const child of folder.children) {
      if (child instanceof import_obsidian2.TFile && child.extension === "md") {
        files.push(child.path);
      } else if (child instanceof import_obsidian2.TFolder) {
        this.collectFilesFromFolder(child, files);
      }
    }
  }
  /**
   * Search notes by content
   */
  async searchNotes(query) {
    if (!query) {
      return { success: false, error: "Query is required" };
    }
    try {
      const results = [];
      const files = this.app.vault.getMarkdownFiles();
      const queryLower = query.toLowerCase();
      for (const file of files) {
        const content = await this.app.vault.cachedRead(file);
        if (content.toLowerCase().includes(queryLower)) {
          const lines = content.split("\n");
          const matchingLines = [];
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(queryLower)) {
              matchingLines.push(`  Line ${i + 1}: ${lines[i].trim().substring(0, 100)}`);
              if (matchingLines.length >= 3)
                break;
            }
          }
          results.push(`${file.path}
${matchingLines.join("\n")}`);
        }
      }
      if (results.length === 0) {
        return { success: true, result: `No notes found containing "${query}".` };
      }
      return { success: true, result: results.join("\n\n") };
    } catch (error) {
      return { success: false, error: `Failed to search notes: ${error}` };
    }
  }
  /**
   * Create folder
   */
  async createFolder(path) {
    if (!path) {
      return { success: false, error: "Path is required" };
    }
    try {
      await this.ensureFolderExists((0, import_obsidian2.normalizePath)(path));
      return { success: true, result: `Folder created: ${path}` };
    } catch (error) {
      return { success: false, error: `Failed to create folder: ${error}` };
    }
  }
  /**
   * Ensure folder exists, creating it if necessary
   */
  async ensureFolderExists(path) {
    const normalizedPath = (0, import_obsidian2.normalizePath)(path);
    const folder = this.app.vault.getAbstractFileByPath(normalizedPath);
    if (folder instanceof import_obsidian2.TFolder) {
      return;
    }
    await this.app.vault.createFolder(normalizedPath);
  }
};
function buildAgenticSystemPrompt(basePrompt) {
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
  return `${basePrompt}

${toolDocs}`;
}

// src/api/claude.ts
function createClaudeClient(settings) {
  if (settings.authMode === "api-key") {
    return new AnthropicApiClient(settings);
  }
  return new ClaudeCodeClient(settings);
}
function buildSystemPrompt(settings) {
  const langInstruction = settings.responseLanguage === "zh-TW" ? "Respond in Traditional Chinese (\u7E41\u9AD4\u4E2D\u6587)." : "Respond in English.";
  const basePrompt = `${settings.prompts.system}
${langInstruction}`;
  if (settings.agenticMode) {
    return buildAgenticSystemPrompt(basePrompt);
  }
  return basePrompt;
}

// src/i18n/index.ts
var translations = {
  "zh-TW": {
    // Settings
    "settings.title": "Clauwrite \u8A2D\u5B9A",
    "settings.authMode": "\u8A8D\u8B49\u65B9\u5F0F",
    "settings.authMode.desc": "\u9078\u64C7\u5982\u4F55\u9023\u63A5 Claude API",
    "settings.authMode.apiKey": "API Key\uFF08\u9069\u5408\u6240\u6709\u5E73\u53F0\uFF09",
    "settings.authMode.cli": "Claude Code CLI\uFF08\u9700\u5148\u5B89\u88DD\uFF09",
    "settings.apiKey": "API Key",
    "settings.apiKey.desc": "\u8F38\u5165\u60A8\u7684 Anthropic API Key",
    "settings.cliPath": "CLI \u8DEF\u5F91",
    "settings.cliPath.desc": "Claude Code CLI \u7684\u57F7\u884C\u8DEF\u5F91\u3002",
    "settings.cliPath.hint": "\u53EF\u5728\u7D42\u7AEF\u6A5F\u57F7\u884C {macCmd}\uFF08macOS/Linux\uFF09\u6216 {winCmd}\uFF08Windows\uFF09\u4F86\u67E5\u8A62\u8DEF\u5F91\u3002",
    "settings.testConnection": "\u6E2C\u8A66\u9023\u7DDA",
    "settings.testConnection.desc": "\u9A57\u8B49 Claude Code CLI \u662F\u5426\u53EF\u7528",
    "settings.testConnection.button": "\u6E2C\u8A66\u9023\u7DDA",
    "settings.testConnection.testing": "\u6E2C\u8A66\u4E2D...",
    "settings.testConnection.success": "\u9023\u7DDA\u6210\u529F",
    "settings.testConnection.failed": "\u9023\u7DDA\u5931\u6557",
    "settings.model": "\u6A21\u578B\u8A2D\u5B9A",
    "settings.model.select": "Model",
    "settings.model.desc": "\u9078\u64C7\u8981\u4F7F\u7528\u7684 Claude \u6A21\u578B",
    "settings.maxTokens": "Max Tokens",
    "settings.maxTokens.desc": "\u56DE\u61C9\u7684\u6700\u5927 token \u6578\u91CF",
    "settings.preferences": "\u504F\u597D\u8A2D\u5B9A",
    "settings.language": "\u4ECB\u9762\u8A9E\u8A00",
    "settings.language.desc": "\u63D2\u4EF6\u4ECB\u9762\u7684\u986F\u793A\u8A9E\u8A00",
    "settings.responseLanguage": "\u56DE\u61C9\u8A9E\u8A00",
    "settings.responseLanguage.desc": "Claude \u56DE\u61C9\u7684\u8A9E\u8A00",
    "settings.prompts": "Prompt \u6A21\u677F",
    "settings.prompts.system": "System Prompt",
    "settings.prompts.system.desc": "\u7CFB\u7D71\u63D0\u793A\u8A5E\uFF0C\u5B9A\u7FA9 Claude \u7684\u89D2\u8272\u548C\u884C\u70BA",
    "settings.prompts.summarize": "\u6458\u8981 Prompt",
    "settings.prompts.summarize.desc": "\u6458\u8981\u529F\u80FD\u7684\u63D0\u793A\u8A5E",
    "settings.prompts.rewrite": "\u6539\u5BEB Prompt",
    "settings.prompts.rewrite.desc": "\u6539\u5BEB\u529F\u80FD\u7684\u63D0\u793A\u8A5E",
    "settings.prompts.ask": "\u8A62\u554F Prompt",
    "settings.prompts.ask.desc": "\u8A62\u554F\u529F\u80FD\u7684\u63D0\u793A\u8A5E\uFF0C\u4F7F\u7528 {{question}} \u4EE3\u8868\u554F\u984C",
    "settings.prompts.reset": "\u91CD\u8A2D\u70BA\u9810\u8A2D",
    "settings.conversation": "\u5C0D\u8A71\u8A2D\u5B9A",
    "settings.maxHistory": "\u6B77\u53F2\u8A0A\u606F\u6578\u91CF",
    "settings.maxHistory.desc": "\u4FDD\u7559\u7684\u5C0D\u8A71\u6B77\u53F2\u6578\u91CF\uFF08\u6BCF\u8F2A\u5C0D\u8A71\u7B97 2 \u5247\uFF09",
    "settings.clearHistory": "\u6E05\u9664\u5C0D\u8A71\u6B77\u53F2",
    "settings.clearHistory.desc": "\u522A\u9664\u6240\u6709\u5132\u5B58\u7684\u5C0D\u8A71\u8A18\u9304",
    "settings.clearHistory.button": "\u6E05\u9664",
    "settings.clearHistory.done": "\u5DF2\u6E05\u9664\u5C0D\u8A71\u6B77\u53F2",
    "settings.agentic": "Agentic \u6A21\u5F0F",
    "settings.agentic.enable": "\u555F\u7528 Agentic \u6A21\u5F0F",
    "settings.agentic.desc": "\u5141\u8A31 Claude \u81EA\u52D5\u8B80\u53D6\u3001\u5275\u5EFA\u3001\u7DE8\u8F2F\u548C\u641C\u5C0B\u7B46\u8A18",
    // Chat View
    "chat.title": "Clauwrite",
    "chat.context": "Context",
    "chat.context.none": "\u7121",
    "chat.context.selection": "\u9078\u53D6\u5167\u5BB9",
    "chat.input.placeholder": "\u8F38\u5165\u8A0A\u606F...",
    "chat.send": "\u9001\u51FA",
    "chat.thinking": "\u601D\u8003\u4E2D...",
    "chat.you": "You",
    "chat.claude": "Claude",
    "chat.error": "Error",
    "chat.replace": "\u53D6\u4EE3\u9078\u53D6\u5167\u5BB9",
    "chat.newChat": "\u65B0\u5C0D\u8A71",
    "chat.clearConfirm": "\u78BA\u5B9A\u8981\u6E05\u9664\u5C0D\u8A71\u6B77\u53F2\u55CE\uFF1F",
    "chat.fileUpdated": "\u6A94\u6848\u5DF2\u66F4\u65B0",
    "chat.toolExecuting": "\u57F7\u884C\u5DE5\u5177\u4E2D...",
    "chat.toolResult": "\u5DE5\u5177\u7D50\u679C",
    // Commands
    "command.openChat": "\u958B\u555F\u5C0D\u8A71\u8996\u7A97",
    "command.summarize": "\u6458\u8981\u7576\u524D\u5167\u5BB9",
    "command.rewrite": "\u6539\u5BEB\u9078\u53D6\u5167\u5BB9",
    "command.ask": "\u8A62\u554F\u95DC\u65BC\u7576\u524D\u5167\u5BB9",
    // Prompts (always in English for Claude)
    "prompt.summarize": "Please provide a concise summary of the following content:",
    "prompt.rewrite": "Please rewrite the following content to be clearer and more readable while preserving the meaning:",
    "prompt.ask": "Answer the question based on the following content.\n\nQuestion: {question}",
    "prompt.askModal.title": "\u8A62\u554F\u95DC\u65BC\u7576\u524D\u5167\u5BB9",
    "prompt.askModal.placeholder": "\u8F38\u5165\u60A8\u7684\u554F\u984C...",
    "prompt.askModal.cancel": "\u53D6\u6D88",
    "prompt.askModal.submit": "\u9001\u51FA",
    // Notices
    "notice.selectContent": "\u8ACB\u5148\u9078\u53D6\u8981\u6539\u5BEB\u7684\u5167\u5BB9",
    "notice.openNote": "\u8ACB\u5148\u958B\u555F\u7B46\u8A18\u6216\u9078\u53D6\u5167\u5BB9",
    "notice.cannotOpenChat": "\u7121\u6CD5\u958B\u555F\u5C0D\u8A71\u8996\u7A97",
    "notice.enterQuestion": "\u8ACB\u8F38\u5165\u554F\u984C",
    "notice.cliDetected": "\u5DF2\u5075\u6E2C\u5230 Claude Code CLI\uFF0C\u5C07\u4F7F\u7528 CLI \u6A21\u5F0F",
    "notice.enterApiKey": "\u8ACB\u5728\u8A2D\u5B9A\u4E2D\u8F38\u5165 API Key \u6216\u5B89\u88DD Claude Code CLI",
    "notice.mobileApiKey": "\u8ACB\u5728\u8A2D\u5B9A\u4E2D\u8F38\u5165 API Key",
    // Errors
    "error.unknown": "\u767C\u751F\u672A\u77E5\u932F\u8AA4\uFF0C\u8ACB\u6AA2\u67E5\u958B\u767C\u8005\u5DE5\u5177\u7684 Console \u4EE5\u7372\u53D6\u8A73\u7D30\u8CC7\u8A0A",
    "error.timeout": "\u8ACB\u6C42\u903E\u6642\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66",
    "error.cliNotFound": "\u627E\u4E0D\u5230 claude \u547D\u4EE4\uFF0C\u8ACB\u78BA\u8A8D\u5DF2\u5B89\u88DD Claude Code \u6216\u6AA2\u67E5\u8DEF\u5F91\u8A2D\u5B9A",
    "error.notAuthenticated": "Claude Code \u5C1A\u672A\u767B\u5165\uFF0C\u8ACB\u5148\u57F7\u884C `claude` \u5B8C\u6210\u767B\u5165",
    "error.cliError": "\u57F7\u884C Claude Code CLI \u6642\u767C\u751F\u932F\u8AA4",
    "error.cliExitCode": "CLI \u8FD4\u56DE\u932F\u8AA4\u78BC: {code}",
    "error.execError": "\u57F7\u884C\u932F\u8AA4: {message}",
    "error.noActiveFile": "\u627E\u4E0D\u5230\u958B\u555F\u7684\u6A94\u6848",
    "error.editFailed": "\u7DE8\u8F2F\u6A94\u6848\u5931\u6557"
  },
  "en": {
    // Settings
    "settings.title": "Clauwrite Settings",
    "settings.authMode": "Authentication",
    "settings.authMode.desc": "Choose how to connect to Claude API",
    "settings.authMode.apiKey": "API Key (works on all platforms)",
    "settings.authMode.cli": "Claude Code CLI (requires installation)",
    "settings.apiKey": "API Key",
    "settings.apiKey.desc": "Enter your Anthropic API Key",
    "settings.cliPath": "CLI Path",
    "settings.cliPath.desc": "Path to Claude Code CLI executable.",
    "settings.cliPath.hint": "Run {macCmd} (macOS/Linux) or {winCmd} (Windows) in terminal to find the path.",
    "settings.testConnection": "Test Connection",
    "settings.testConnection.desc": "Verify Claude Code CLI is available",
    "settings.testConnection.button": "Test",
    "settings.testConnection.testing": "Testing...",
    "settings.testConnection.success": "Connected",
    "settings.testConnection.failed": "Failed",
    "settings.model": "Model Settings",
    "settings.model.select": "Model",
    "settings.model.desc": "Select the Claude model to use",
    "settings.maxTokens": "Max Tokens",
    "settings.maxTokens.desc": "Maximum tokens in response",
    "settings.preferences": "Preferences",
    "settings.language": "Interface Language",
    "settings.language.desc": "Language for plugin interface",
    "settings.responseLanguage": "Response Language",
    "settings.responseLanguage.desc": "Language for Claude responses",
    "settings.prompts": "Prompt Templates",
    "settings.prompts.system": "System Prompt",
    "settings.prompts.system.desc": "System prompt that defines Claude's role and behavior",
    "settings.prompts.summarize": "Summarize Prompt",
    "settings.prompts.summarize.desc": "Prompt for summarize function",
    "settings.prompts.rewrite": "Rewrite Prompt",
    "settings.prompts.rewrite.desc": "Prompt for rewrite function",
    "settings.prompts.ask": "Ask Prompt",
    "settings.prompts.ask.desc": "Prompt for ask function, use {{question}} as placeholder",
    "settings.prompts.reset": "Reset to Default",
    "settings.conversation": "Conversation",
    "settings.maxHistory": "History Length",
    "settings.maxHistory.desc": "Number of messages to keep in history (each round = 2 messages)",
    "settings.clearHistory": "Clear History",
    "settings.clearHistory.desc": "Delete all saved conversation history",
    "settings.clearHistory.button": "Clear",
    "settings.clearHistory.done": "Conversation history cleared",
    "settings.agentic": "Agentic Mode",
    "settings.agentic.enable": "Enable Agentic Mode",
    "settings.agentic.desc": "Allow Claude to read, create, edit, and search notes automatically",
    // Chat View
    "chat.title": "Clauwrite",
    "chat.context": "Context",
    "chat.context.none": "None",
    "chat.context.selection": "Selection",
    "chat.input.placeholder": "Type a message...",
    "chat.send": "Send",
    "chat.thinking": "Thinking...",
    "chat.you": "You",
    "chat.claude": "Claude",
    "chat.error": "Error",
    "chat.replace": "Replace Selection",
    "chat.newChat": "New Chat",
    "chat.clearConfirm": "Clear conversation history?",
    "chat.fileUpdated": "File updated",
    "chat.toolExecuting": "Executing tool...",
    "chat.toolResult": "Tool result",
    // Commands
    "command.openChat": "Open Chat",
    "command.summarize": "Summarize Content",
    "command.rewrite": "Rewrite Selection",
    "command.ask": "Ask About Content",
    // Prompts
    "prompt.summarize": "Please provide a concise summary of the following content:",
    "prompt.rewrite": "Please rewrite the following content to be clearer and more readable while preserving the meaning:",
    "prompt.ask": "Answer the question based on the following content.\n\nQuestion: {question}",
    "prompt.askModal.title": "Ask About Content",
    "prompt.askModal.placeholder": "Enter your question...",
    "prompt.askModal.cancel": "Cancel",
    "prompt.askModal.submit": "Submit",
    // Notices
    "notice.selectContent": "Please select content to rewrite",
    "notice.openNote": "Please open a note or select content",
    "notice.cannotOpenChat": "Cannot open chat window",
    "notice.enterQuestion": "Please enter a question",
    "notice.cliDetected": "Claude Code CLI detected, using CLI mode",
    "notice.enterApiKey": "Please enter API Key in settings or install Claude Code CLI",
    "notice.mobileApiKey": "Please enter API Key in settings",
    // Errors
    "error.unknown": "Unknown error occurred. Check Console in developer tools for details",
    "error.timeout": "Request timed out, please try again",
    "error.cliNotFound": "Cannot find claude command. Please install Claude Code or check path settings",
    "error.notAuthenticated": "Claude Code not logged in. Please run `claude` to login first",
    "error.cliError": "Error executing Claude Code CLI",
    "error.cliExitCode": "CLI returned error code: {code}",
    "error.execError": "Execution error: {message}",
    "error.noActiveFile": "No active file found",
    "error.editFailed": "Failed to edit file"
  }
};
var currentLanguage = "zh-TW";
function setLanguage(lang) {
  currentLanguage = lang;
}
function t(key, params) {
  let text = translations[currentLanguage][key] || translations["zh-TW"][key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
}

// src/settings.ts
var DEFAULT_PROMPTS = {
  system: `You are an Obsidian note assistant. Help users with their notes.
Use Markdown formatting. Keep responses concise and well-organized.

When the user asks you to edit or modify the current file, respond with the complete new content wrapped in:
<<<APPLY_EDIT>>>
(new file content here)
<<<END_EDIT>>>

Only use this format when the user explicitly asks to modify/edit/update the file. For questions or discussions, respond normally.`,
  summarize: "Please provide a concise summary of the following content:",
  rewrite: "Please rewrite the following content to be clearer and more readable while preserving the meaning:",
  ask: "Answer the question based on the following content.\n\nQuestion: {{question}}"
};
var DEFAULT_SETTINGS = {
  authMode: "claude-code",
  apiKey: "",
  claudeCodePath: "claude",
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  uiLanguage: "zh-TW",
  responseLanguage: "zh-TW",
  prompts: { ...DEFAULT_PROMPTS },
  maxHistoryLength: 20,
  conversationHistory: [],
  isFirstLoad: true,
  agenticMode: false
};
var AVAILABLE_MODELS = [
  { value: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", name: "Claude Opus 4" },
  { value: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { value: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" }
];
var ClauwriteSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.apiKeySettingEl = null;
    this.cliSettingEl = null;
    this.cliTestSettingEl = null;
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian3.Setting(containerEl).setName(t("settings.title")).setHeading();
    if (import_obsidian3.Platform.isDesktop) {
      this.renderAuthModeSection(containerEl);
    }
    this.apiKeySettingEl = containerEl.createDiv();
    this.renderApiKeySetting(this.apiKeySettingEl);
    if (import_obsidian3.Platform.isDesktop) {
      this.cliSettingEl = containerEl.createDiv();
      this.renderCliPathSetting(this.cliSettingEl);
      this.cliTestSettingEl = containerEl.createDiv();
      this.renderCliTestSetting(this.cliTestSettingEl);
    }
    this.updateAuthModeVisibility();
    new import_obsidian3.Setting(containerEl).setName(t("settings.model")).setHeading();
    this.renderModelSetting(containerEl);
    this.renderMaxTokensSetting(containerEl);
    new import_obsidian3.Setting(containerEl).setName(t("settings.preferences")).setHeading();
    this.renderUiLanguageSetting(containerEl);
    this.renderResponseLanguageSetting(containerEl);
    new import_obsidian3.Setting(containerEl).setName(t("settings.agentic")).setHeading();
    this.renderAgenticModeSetting(containerEl);
    new import_obsidian3.Setting(containerEl).setName(t("settings.prompts")).setHeading();
    this.renderPromptSettings(containerEl);
    new import_obsidian3.Setting(containerEl).setName(t("settings.conversation")).setHeading();
    this.renderConversationSettings(containerEl);
  }
  renderAuthModeSection(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.authMode")).setDesc(t("settings.authMode.desc")).addDropdown((dropdown) => {
      dropdown.addOption("api-key", t("settings.authMode.apiKey")).addOption("claude-code", t("settings.authMode.cli")).setValue(this.plugin.settings.authMode).onChange(async (value) => {
        this.plugin.settings.authMode = value;
        await this.plugin.saveSettings();
        this.updateAuthModeVisibility();
      });
    });
  }
  renderApiKeySetting(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.apiKey")).setDesc(t("settings.apiKey.desc")).addText((text) => {
      text.setPlaceholder("sk-ant-...").setValue(this.maskApiKey(this.plugin.settings.apiKey)).onChange(async (value) => {
        if (!value.includes("\u2022\u2022\u2022\u2022")) {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }
      });
      text.inputEl.type = "password";
      text.inputEl.addEventListener("focus", () => {
        if (this.plugin.settings.apiKey) {
          text.setValue(this.plugin.settings.apiKey);
        }
      });
      text.inputEl.addEventListener("blur", () => {
        text.setValue(this.maskApiKey(this.plugin.settings.apiKey));
      });
    });
  }
  renderCliPathSetting(containerEl) {
    const descFragment = document.createDocumentFragment();
    descFragment.appendText(t("settings.cliPath.desc"));
    descFragment.createEl("br");
    const hintText = t("settings.cliPath.hint", { macCmd: "", winCmd: "" });
    const parts = hintText.split(/\{macCmd\}|\{winCmd\}/);
    descFragment.appendText(parts[0] || "");
    descFragment.createEl("code", { text: "which claude" });
    descFragment.appendText(parts[1] || "");
    descFragment.createEl("code", { text: "where claude" });
    descFragment.appendText(parts[2] || "");
    new import_obsidian3.Setting(containerEl).setName(t("settings.cliPath")).setDesc(descFragment).addText((text) => {
      text.setPlaceholder("/Users/user/.local/bin/claude").setValue(this.plugin.settings.claudeCodePath).onChange(async (value) => {
        this.plugin.settings.claudeCodePath = value || "claude";
        await this.plugin.saveSettings();
      });
    });
  }
  renderCliTestSetting(containerEl) {
    const setting = new import_obsidian3.Setting(containerEl).setName(t("settings.testConnection")).setDesc(t("settings.testConnection.desc"));
    const statusEl = containerEl.createSpan({ cls: "clauwrite-test-status" });
    setting.addButton((button) => {
      button.setButtonText(t("settings.testConnection.button")).onClick(async () => {
        statusEl.empty();
        statusEl.removeClass("clauwrite-test-status-success", "clauwrite-test-status-error");
        statusEl.setText(t("settings.testConnection.testing"));
        button.setDisabled(true);
        try {
          const client = createClaudeClient(this.plugin.settings);
          const success = await client.testConnection();
          if (success) {
            statusEl.setText("\u2705 " + t("settings.testConnection.success"));
            statusEl.addClass("clauwrite-test-status-success");
          } else {
            statusEl.setText("\u274C " + t("settings.testConnection.failed"));
            statusEl.addClass("clauwrite-test-status-error");
          }
        } catch (error) {
          statusEl.setText(`\u274C ${error instanceof Error ? error.message : t("settings.testConnection.failed")}`);
          statusEl.addClass("clauwrite-test-status-error");
        } finally {
          button.setDisabled(false);
        }
      });
    });
  }
  renderModelSetting(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.model.select")).setDesc(t("settings.model.desc")).addDropdown((dropdown) => {
      AVAILABLE_MODELS.forEach((model) => {
        dropdown.addOption(model.value, model.name);
      });
      dropdown.setValue(this.plugin.settings.model).onChange(async (value) => {
        this.plugin.settings.model = value;
        await this.plugin.saveSettings();
      });
    });
  }
  renderMaxTokensSetting(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.maxTokens")).setDesc(t("settings.maxTokens.desc")).addText((text) => {
      text.setPlaceholder("4096").setValue(String(this.plugin.settings.maxTokens)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num > 0) {
          this.plugin.settings.maxTokens = num;
          await this.plugin.saveSettings();
        }
      });
      text.inputEl.type = "number";
      text.inputEl.min = "1";
      text.inputEl.max = "8192";
    });
  }
  renderUiLanguageSetting(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.language")).setDesc(t("settings.language.desc")).addDropdown((dropdown) => {
      dropdown.addOption("zh-TW", "\u7E41\u9AD4\u4E2D\u6587").addOption("en", "English").setValue(this.plugin.settings.uiLanguage).onChange(async (value) => {
        this.plugin.settings.uiLanguage = value;
        setLanguage(value);
        await this.plugin.saveSettings();
        this.display();
      });
    });
  }
  renderResponseLanguageSetting(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.responseLanguage")).setDesc(t("settings.responseLanguage.desc")).addDropdown((dropdown) => {
      dropdown.addOption("zh-TW", "\u7E41\u9AD4\u4E2D\u6587").addOption("en", "English").setValue(this.plugin.settings.responseLanguage).onChange(async (value) => {
        this.plugin.settings.responseLanguage = value;
        await this.plugin.saveSettings();
      });
    });
  }
  renderPromptSettings(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.prompts.system")).setDesc(t("settings.prompts.system.desc")).addTextArea((text) => {
      text.setValue(this.plugin.settings.prompts.system).onChange(async (value) => {
        this.plugin.settings.prompts.system = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 3;
      text.inputEl.cols = 40;
    });
    new import_obsidian3.Setting(containerEl).setName(t("settings.prompts.summarize")).setDesc(t("settings.prompts.summarize.desc")).addTextArea((text) => {
      text.setValue(this.plugin.settings.prompts.summarize).onChange(async (value) => {
        this.plugin.settings.prompts.summarize = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 2;
      text.inputEl.cols = 40;
    });
    new import_obsidian3.Setting(containerEl).setName(t("settings.prompts.rewrite")).setDesc(t("settings.prompts.rewrite.desc")).addTextArea((text) => {
      text.setValue(this.plugin.settings.prompts.rewrite).onChange(async (value) => {
        this.plugin.settings.prompts.rewrite = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 2;
      text.inputEl.cols = 40;
    });
    new import_obsidian3.Setting(containerEl).setName(t("settings.prompts.ask")).setDesc(t("settings.prompts.ask.desc")).addTextArea((text) => {
      text.setValue(this.plugin.settings.prompts.ask).onChange(async (value) => {
        this.plugin.settings.prompts.ask = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 2;
      text.inputEl.cols = 40;
    });
    new import_obsidian3.Setting(containerEl).addButton((button) => {
      button.setButtonText(t("settings.prompts.reset")).onClick(async () => {
        this.plugin.settings.prompts = { ...DEFAULT_PROMPTS };
        await this.plugin.saveSettings();
        this.display();
      });
    });
  }
  renderAgenticModeSetting(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.agentic.enable")).setDesc(t("settings.agentic.desc")).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.agenticMode).onChange(async (value) => {
        this.plugin.settings.agenticMode = value;
        await this.plugin.saveSettings();
      });
    });
  }
  renderConversationSettings(containerEl) {
    new import_obsidian3.Setting(containerEl).setName(t("settings.maxHistory")).setDesc(t("settings.maxHistory.desc")).addText((text) => {
      text.setPlaceholder("20").setValue(String(this.plugin.settings.maxHistoryLength)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0) {
          this.plugin.settings.maxHistoryLength = num;
          await this.plugin.saveSettings();
        }
      });
      text.inputEl.type = "number";
      text.inputEl.min = "0";
      text.inputEl.max = "100";
    });
    new import_obsidian3.Setting(containerEl).setName(t("settings.clearHistory")).setDesc(t("settings.clearHistory.desc")).addButton((button) => {
      button.setButtonText(t("settings.clearHistory.button")).onClick(async () => {
        this.plugin.settings.conversationHistory = [];
        await this.plugin.saveSettings();
        new import_obsidian3.Notice(t("settings.clearHistory.done"));
      });
    });
  }
  updateAuthModeVisibility() {
    const isApiKeyMode = this.plugin.settings.authMode === "api-key" || import_obsidian3.Platform.isMobile;
    if (this.apiKeySettingEl) {
      this.apiKeySettingEl.toggleClass("clauwrite-hidden", !isApiKeyMode);
    }
    if (this.cliSettingEl) {
      this.cliSettingEl.toggleClass("clauwrite-hidden", isApiKeyMode);
    }
    if (this.cliTestSettingEl) {
      this.cliTestSettingEl.toggleClass("clauwrite-hidden", isApiKeyMode);
    }
  }
  maskApiKey(apiKey) {
    if (!apiKey)
      return "";
    if (apiKey.length <= 10)
      return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    return apiKey.substring(0, 7) + "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + apiKey.substring(apiKey.length - 4);
  }
};

// src/views/ChatView.ts
var import_obsidian5 = require("obsidian");

// src/utils/context.ts
var import_obsidian4 = require("obsidian");
function getMarkdownView(app) {
  const activeView = app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
  if (activeView) {
    return activeView;
  }
  let markdownView = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (!markdownView && leaf.view instanceof import_obsidian4.MarkdownView) {
      markdownView = leaf.view;
    }
  });
  return markdownView;
}
function getActiveEditor(app) {
  const view = getMarkdownView(app);
  if (!view) {
    return null;
  }
  return view.editor;
}
function getContext(app) {
  const view = getMarkdownView(app);
  if (!view) {
    return null;
  }
  const editor = view.editor;
  const file = view.file;
  const fullContent = editor.getValue();
  const filePath = file == null ? void 0 : file.path;
  const selection = editor.getSelection();
  if (selection) {
    return {
      content: selection,
      source: "\u9078\u53D6\u5167\u5BB9",
      filePath,
      fullContent
    };
  }
  if (!fullContent) {
    return null;
  }
  return {
    content: fullContent,
    source: (file == null ? void 0 : file.basename) || "\u7576\u524D\u7B46\u8A18",
    filePath,
    fullContent
  };
}
function replaceSelection(editor, newContent) {
  const selection = editor.getSelection();
  if (!selection) {
    return;
  }
  editor.replaceSelection(newContent);
}

// src/views/ChatView.ts
var CHAT_VIEW_TYPE = "clauwrite-chat-view";
var MAX_AGENTIC_ITERATIONS = 10;
var ChatView = class extends import_obsidian5.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.streamingMessageEl = null;
    this.streamingContentEl = null;
    this.messages = [];
    this.isLoading = false;
    this.lastSelectionContent = null;
    this.plugin = plugin;
    this.toolExecutor = new AgentToolExecutor(this.app);
  }
  getViewType() {
    return CHAT_VIEW_TYPE;
  }
  getDisplayText() {
    return t("chat.title");
  }
  getIcon() {
    return "message-circle";
  }
  onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("clauwrite-chat-container");
    this.renderHeader(container);
    this.renderContextIndicator(container);
    this.renderMessages(container);
    this.renderInputArea(container);
    this.loadConversationHistory();
    this.updateContextIndicator();
  }
  async onClose() {
    await this.saveConversationHistory();
  }
  renderHeader(container) {
    const header = container.createDiv({ cls: "clauwrite-header" });
    header.createSpan({ cls: "clauwrite-header-title", text: t("chat.title") });
    const actions = header.createDiv({ cls: "clauwrite-header-actions" });
    const newChatIcon = actions.createSpan({ cls: "clauwrite-header-icon" });
    (0, import_obsidian5.setIcon)(newChatIcon, "plus");
    newChatIcon.setAttribute("aria-label", t("chat.newChat"));
    newChatIcon.addEventListener("click", () => {
      void this.clearConversation();
    });
    const settingsIcon = actions.createSpan({ cls: "clauwrite-header-icon" });
    (0, import_obsidian5.setIcon)(settingsIcon, "settings");
    settingsIcon.addEventListener("click", () => {
      this.app.setting.open();
      this.app.setting.openTabById("clauwrite");
    });
  }
  renderContextIndicator(container) {
    const contextDiv = container.createDiv({ cls: "clauwrite-context" });
    this.contextIndicatorEl = contextDiv.createDiv({ cls: "clauwrite-context-label" });
  }
  renderMessages(container) {
    this.messagesEl = container.createDiv({ cls: "clauwrite-messages" });
    this.loadingEl = this.messagesEl.createDiv({ cls: "clauwrite-loading clauwrite-loading-hidden" });
    const dotsContainer = this.loadingEl.createDiv({ cls: "clauwrite-loading-dots" });
    dotsContainer.createSpan({ cls: "clauwrite-loading-dot" });
    dotsContainer.createSpan({ cls: "clauwrite-loading-dot" });
    dotsContainer.createSpan({ cls: "clauwrite-loading-dot" });
    this.loadingTextEl = this.loadingEl.createSpan({ text: t("chat.thinking") });
  }
  renderInputArea(container) {
    const inputArea = container.createDiv({ cls: "clauwrite-input-area" });
    this.inputEl = inputArea.createEl("textarea", {
      cls: "clauwrite-input",
      attr: { placeholder: t("chat.input.placeholder") }
    });
    this.inputEl.addEventListener("focus", () => {
      this.updateContextIndicator();
    });
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const message = this.inputEl.value.trim();
        if (message && !this.isLoading) {
          this.inputEl.value = "";
          this.inputEl.dispatchEvent(new Event("input"));
          void this.handleSendMessage(message);
        }
      }
    });
    this.sendButton = inputArea.createEl("button", {
      cls: "clauwrite-send-button",
      text: t("chat.send")
    });
    this.sendButton.addEventListener("click", () => {
      void this.sendMessage();
    });
  }
  updateContextIndicator() {
    const context = getContext(this.app);
    if (context) {
      const source = context.source === "\u9078\u53D6\u5167\u5BB9" ? t("chat.context.selection") : context.source;
      this.contextIndicatorEl.setText(`${t("chat.context")}: ${source}`);
    } else {
      this.contextIndicatorEl.setText(`${t("chat.context")}: ${t("chat.context.none")}`);
    }
  }
  loadConversationHistory() {
    const history = this.plugin.settings.conversationHistory;
    this.messages = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
      showReplaceButton: false
    }));
    this.renderMessageList();
  }
  async saveConversationHistory() {
    const history = this.messages.filter((msg) => msg.role !== "error").map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: Date.now()
    }));
    const maxLength = this.plugin.settings.maxHistoryLength;
    if (history.length > maxLength) {
      history.splice(0, history.length - maxLength);
    }
    this.plugin.settings.conversationHistory = history;
    await this.plugin.saveSettings();
  }
  async clearConversation() {
    this.messages = [];
    this.plugin.settings.conversationHistory = [];
    await this.plugin.saveSettings();
    this.renderMessageList();
  }
  getConversationHistory() {
    return this.messages.filter((msg) => msg.role !== "error").map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: Date.now()
    }));
  }
  async sendMessage() {
    const message = this.inputEl.value.trim();
    if (!message || this.isLoading) {
      return;
    }
    this.inputEl.value = "";
    await this.handleSendMessage(message);
  }
  async handleSendMessage(message) {
    this.updateContextIndicator();
    this.addMessage("user", message);
    const context = getContext(this.app);
    const history = this.getConversationHistory().slice(0, -1);
    const fileInfo = (context == null ? void 0 : context.filePath) ? {
      path: context.filePath,
      fullContent: context.fullContent
    } : void 0;
    await this.sendToClaudeStream(message, context == null ? void 0 : context.content, history, false, fileInfo);
  }
  async sendToClaudeStream(prompt, context, history, showReplaceButton = false, fileInfo) {
    this.setLoading(true);
    this.startStreamingMessage();
    let fullResponse = "";
    const isAgenticMode = this.plugin.settings.agenticMode;
    try {
      const client = createClaudeClient(this.plugin.settings);
      fullResponse = await client.sendMessageStream(prompt, context, history || [], (chunk) => {
        this.updateStreamingMessage(chunk);
      }, fileInfo);
      if (isAgenticMode) {
        const { toolCalls, cleanedResponse } = parseToolCalls(fullResponse);
        if (toolCalls.length > 0) {
          await this.executeAgenticLoop(toolCalls, cleanedResponse, history || [], showReplaceButton);
          return;
        }
      }
      const { displayContent, editContent } = this.parseEditBlocks(fullResponse);
      if (editContent) {
        await this.applyEditToFile(editContent);
      }
      const contentToDisplay = displayContent || fullResponse;
      this.finishStreamingMessage(contentToDisplay, showReplaceButton);
      await this.saveConversationHistory();
    } catch (error) {
      this.cancelStreamingMessage();
      const errorMessage = this.extractErrorMessage(error);
      this.addMessage("error", errorMessage);
    } finally {
      this.setLoading(false);
    }
  }
  /**
   * Execute agentic loop: run tools and continue conversation until no more tool calls
   */
  async executeAgenticLoop(initialToolCalls, initialCleanedResponse, history, showReplaceButton) {
    let toolCalls = initialToolCalls;
    let cleanedResponse = initialCleanedResponse;
    let iteration = 0;
    if (cleanedResponse) {
      this.finishStreamingMessage(cleanedResponse, false);
    } else {
      this.cancelStreamingMessage();
    }
    while (toolCalls.length > 0 && iteration < MAX_AGENTIC_ITERATIONS) {
      iteration++;
      this.loadingTextEl.setText(t("chat.toolExecuting"));
      const toolResults = await this.executeToolCalls(toolCalls);
      const toolResultMessage = this.formatToolResults(toolCalls, toolResults);
      const toolResultHistory = [
        ...history,
        ...cleanedResponse ? [{ role: "assistant", content: cleanedResponse, timestamp: Date.now() }] : [],
        { role: "user", content: toolResultMessage, timestamp: Date.now() }
      ];
      this.loadingTextEl.setText(t("chat.thinking"));
      this.startStreamingMessage();
      let nextResponse = "";
      try {
        const client = createClaudeClient(this.plugin.settings);
        nextResponse = await client.sendMessageStream(
          toolResultMessage,
          void 0,
          toolResultHistory.slice(0, -1),
          // Exclude the message we're sending
          (chunk) => {
            this.updateStreamingMessage(chunk);
          }
        );
      } catch (error) {
        this.cancelStreamingMessage();
        const errorMessage = this.extractErrorMessage(error);
        this.addMessage("error", errorMessage);
        this.setLoading(false);
        return;
      }
      const parsed = parseToolCalls(nextResponse);
      toolCalls = parsed.toolCalls;
      cleanedResponse = parsed.cleanedResponse;
      history = toolResultHistory;
      if (toolCalls.length === 0) {
        const { displayContent, editContent } = this.parseEditBlocks(nextResponse);
        if (editContent) {
          await this.applyEditToFile(editContent);
        }
        const contentToDisplay = displayContent || cleanedResponse || nextResponse;
        this.finishStreamingMessage(contentToDisplay, showReplaceButton);
      } else if (cleanedResponse) {
        this.finishStreamingMessage(cleanedResponse, false);
      } else {
        this.cancelStreamingMessage();
      }
    }
    if (iteration >= MAX_AGENTIC_ITERATIONS) {
      this.addMessage("error", `Reached maximum iterations (${MAX_AGENTIC_ITERATIONS})`);
    }
    await this.saveConversationHistory();
    this.setLoading(false);
  }
  /**
   * Execute tool calls and return results
   */
  async executeToolCalls(toolCalls) {
    const results = [];
    for (const toolCall of toolCalls) {
      const result = await this.toolExecutor.execute(toolCall);
      results.push(result);
    }
    return results;
  }
  /**
   * Format tool results for Claude
   */
  formatToolResults(toolCalls, results) {
    const formatted = toolCalls.map((call, i) => {
      const result = results[i];
      if (result.success) {
        return `Tool: ${call.tool}
Result:
${result.result}`;
      } else {
        return `Tool: ${call.tool}
Error: ${result.error}`;
      }
    });
    return `Tool execution results:

${formatted.join("\n\n---\n\n")}`;
  }
  async sendPromptWithContext(prompt, showReplaceButton = false) {
    this.addMessage("user", prompt);
    const context = getContext(this.app);
    if (showReplaceButton && (context == null ? void 0 : context.source) === "\u9078\u53D6\u5167\u5BB9") {
      this.lastSelectionContent = context.content;
    }
    const history = this.getConversationHistory().slice(0, -1);
    const fileInfo = (context == null ? void 0 : context.filePath) ? {
      path: context.filePath,
      fullContent: context.fullContent
    } : void 0;
    await this.sendToClaudeStream(prompt, context == null ? void 0 : context.content, history, showReplaceButton, fileInfo);
  }
  startStreamingMessage() {
    this.streamingMessageEl = this.messagesEl.createDiv({
      cls: "clauwrite-message clauwrite-message-assistant clauwrite-message-streaming"
    });
    this.streamingMessageEl.createDiv({ cls: "clauwrite-message-role", text: t("chat.claude") });
    this.streamingContentEl = this.streamingMessageEl.createDiv({ cls: "clauwrite-message-content" });
    this.messagesEl.insertBefore(this.streamingMessageEl, this.loadingEl);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
  updateStreamingMessage(chunk) {
    if (!this.streamingContentEl)
      return;
    const currentText = this.streamingContentEl.getText() + chunk;
    this.streamingContentEl.setText(currentText);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
  finishStreamingMessage(finalContent, showReplaceButton) {
    if (!this.streamingMessageEl || !this.streamingContentEl)
      return;
    this.streamingMessageEl.removeClass("clauwrite-message-streaming");
    this.streamingContentEl.empty();
    void import_obsidian5.MarkdownRenderer.render(
      this.app,
      finalContent,
      this.streamingContentEl,
      "",
      this
    );
    if (showReplaceButton && this.lastSelectionContent) {
      const replaceBtn = this.streamingMessageEl.createEl("button", {
        cls: "clauwrite-replace-button",
        text: t("chat.replace")
      });
      const content = finalContent;
      replaceBtn.addEventListener("click", () => {
        const editor = getActiveEditor(this.app);
        if (editor) {
          replaceSelection(editor, content);
        }
      });
    }
    this.messages.push({ role: "assistant", content: finalContent, showReplaceButton });
    this.streamingMessageEl = null;
    this.streamingContentEl = null;
  }
  cancelStreamingMessage() {
    if (this.streamingMessageEl) {
      this.streamingMessageEl.remove();
      this.streamingMessageEl = null;
      this.streamingContentEl = null;
    }
  }
  addMessage(role, content, showReplaceButton = false) {
    this.messages.push({ role, content, showReplaceButton });
    this.renderMessageList();
  }
  renderMessageList() {
    const children = Array.from(this.messagesEl.children);
    children.forEach((child) => {
      if (!child.hasClass("clauwrite-loading") && !child.hasClass("clauwrite-message-streaming")) {
        child.remove();
      }
    });
    this.messages.forEach((msg) => {
      const messageEl = this.messagesEl.createDiv({
        cls: `clauwrite-message clauwrite-message-${msg.role}`
      });
      const roleLabel = msg.role === "user" ? t("chat.you") : msg.role === "assistant" ? t("chat.claude") : t("chat.error");
      messageEl.createDiv({ cls: "clauwrite-message-role", text: roleLabel });
      const contentEl = messageEl.createDiv({ cls: "clauwrite-message-content" });
      if (msg.role === "error") {
        contentEl.setText(msg.content);
      } else {
        void import_obsidian5.MarkdownRenderer.render(
          this.app,
          msg.content,
          contentEl,
          "",
          this
        );
      }
      if (msg.role === "assistant" && msg.showReplaceButton && this.lastSelectionContent) {
        const replaceBtn = messageEl.createEl("button", {
          cls: "clauwrite-replace-button",
          text: t("chat.replace")
        });
        replaceBtn.addEventListener("click", () => {
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
  setLoading(loading) {
    this.isLoading = loading;
    this.loadingEl.toggleClass("clauwrite-loading-hidden", !loading);
    this.sendButton.disabled = loading;
    if (loading) {
      this.loadingTextEl.setText(t("chat.thinking"));
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }
  extractErrorMessage(error) {
    console.error("Clauwrite error:", error);
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === "string" && error) {
      return error;
    }
    if (error && typeof error === "object" && "message" in error) {
      const msg = error.message;
      if (typeof msg === "string" && msg) {
        return msg;
      }
    }
    return t("error.unknown");
  }
  /**
   * Parse edit blocks from Claude's response
   */
  parseEditBlocks(response) {
    const editPattern = /<<<APPLY_EDIT>>>\n?([\s\S]*?)\n?<<<END_EDIT>>>/g;
    const matches = [...response.matchAll(editPattern)];
    if (matches.length === 0) {
      return { displayContent: response, editContent: null };
    }
    const editContent = matches[matches.length - 1][1].trim();
    const displayContent = response.replace(editPattern, "").trim();
    return { displayContent, editContent };
  }
  /**
   * Apply edit to the current file
   */
  async applyEditToFile(newContent) {
    let markdownView = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
    if (!markdownView) {
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (!markdownView && leaf.view instanceof import_obsidian5.MarkdownView) {
          markdownView = leaf.view;
        }
      });
    }
    if (!markdownView || !markdownView.file) {
      new import_obsidian5.Notice(t("error.noActiveFile"));
      return false;
    }
    try {
      await this.app.vault.modify(markdownView.file, newContent);
      new import_obsidian5.Notice(t("chat.fileUpdated"));
      return true;
    } catch (error) {
      console.error("Failed to apply edit:", error);
      new import_obsidian5.Notice(t("error.editFailed"));
      return false;
    }
  }
};

// src/commands/summarize.ts
var import_obsidian6 = require("obsidian");
function registerSummarizeCommand(plugin) {
  plugin.addCommand({
    id: "summarize",
    name: t("command.summarize"),
    callback: async () => {
      const context = getContext(plugin.app);
      if (!context) {
        new import_obsidian6.Notice(t("notice.openNote"));
        return;
      }
      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new import_obsidian6.Notice(t("notice.cannotOpenChat"));
        return;
      }
      await chatView.sendPromptWithContext(plugin.settings.prompts.summarize);
    }
  });
}

// src/commands/rewrite.ts
var import_obsidian7 = require("obsidian");
function registerRewriteCommand(plugin) {
  plugin.addCommand({
    id: "rewrite",
    name: t("command.rewrite"),
    editorCallback: async (editor) => {
      const selection = editor.getSelection();
      if (!selection) {
        new import_obsidian7.Notice(t("notice.selectContent"));
        return;
      }
      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new import_obsidian7.Notice(t("notice.cannotOpenChat"));
        return;
      }
      await chatView.sendPromptWithContext(plugin.settings.prompts.rewrite, true);
    }
  });
}

// src/commands/ask.ts
var import_obsidian8 = require("obsidian");
var AskModal = class extends import_obsidian8.Modal {
  constructor(app, plugin) {
    super(app);
    this.question = "";
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("clauwrite-ask-modal");
    contentEl.createEl("h3", { text: t("prompt.askModal.title") });
    const textArea = contentEl.createEl("textarea", {
      attr: { placeholder: t("prompt.askModal.placeholder") }
    });
    textArea.addEventListener("input", () => {
      this.question = textArea.value;
    });
    textArea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void this.submitQuestion();
      }
    });
    const buttonContainer = contentEl.createDiv({ cls: "clauwrite-ask-modal-buttons" });
    const cancelBtn = buttonContainer.createEl("button", { text: t("prompt.askModal.cancel") });
    cancelBtn.addEventListener("click", () => {
      this.close();
    });
    const submitBtn = buttonContainer.createEl("button", {
      text: t("prompt.askModal.submit"),
      cls: "mod-cta"
    });
    submitBtn.addEventListener("click", () => {
      void this.submitQuestion();
    });
    setTimeout(() => textArea.focus(), 10);
  }
  async submitQuestion() {
    if (!this.question.trim()) {
      new import_obsidian8.Notice(t("notice.enterQuestion"));
      return;
    }
    this.close();
    const chatView = await this.plugin.activateChatView();
    if (!chatView) {
      new import_obsidian8.Notice(t("notice.cannotOpenChat"));
      return;
    }
    const prompt = this.plugin.settings.prompts.ask.replace("{{question}}", this.question.trim());
    await chatView.sendPromptWithContext(prompt);
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
function registerAskCommand(plugin) {
  plugin.addCommand({
    id: "ask",
    name: t("command.ask"),
    callback: () => {
      const context = getContext(plugin.app);
      if (!context) {
        new import_obsidian8.Notice(t("notice.openNote"));
        return;
      }
      new AskModal(plugin.app, plugin).open();
    }
  });
}

// src/main.ts
var ClauwritePlugin = class extends import_obsidian9.Plugin {
  async onload() {
    await this.loadSettings();
    setLanguage(this.settings.uiLanguage);
    this.registerView(
      CHAT_VIEW_TYPE,
      (leaf) => new ChatView(leaf, this)
    );
    this.addRibbonIcon("message-circle", "Clauwrite", () => {
      void this.activateChatView();
    });
    this.registerCommands();
    this.addSettingTab(new ClauwriteSettingTab(this.app, this));
    if (this.settings.isFirstLoad) {
      await this.handleFirstLoad();
    }
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  registerCommands() {
    this.addCommand({
      id: "open-chat",
      name: t("command.openChat"),
      callback: () => {
        void this.activateChatView();
      }
    });
    registerSummarizeCommand(this);
    registerRewriteCommand(this);
    registerAskCommand(this);
  }
  async activateChatView() {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(CHAT_VIEW_TYPE);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: CHAT_VIEW_TYPE,
          active: true
        });
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
      return leaf.view;
    }
    return null;
  }
  async handleFirstLoad() {
    if (import_obsidian9.Platform.isDesktop) {
      const cliAvailable = await this.detectClaudeCodeCli();
      if (cliAvailable) {
        this.settings.authMode = "claude-code";
        new import_obsidian9.Notice("Clauwrite: " + t("notice.cliDetected"));
      } else {
        this.settings.authMode = "api-key";
        new import_obsidian9.Notice("Clauwrite: " + t("notice.enterApiKey"));
      }
    } else {
      this.settings.authMode = "api-key";
      new import_obsidian9.Notice("Clauwrite: " + t("notice.mobileApiKey"));
    }
    this.settings.isFirstLoad = false;
    await this.saveSettings();
  }
  async detectClaudeCodeCli() {
    try {
      const tempSettings = { ...this.settings, claudeCodePath: "claude" };
      const client = new ClaudeCodeClient(tempSettings);
      return await client.testConnection();
    } catch (e) {
      return false;
    }
  }
};
