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
var import_obsidian8 = require("obsidian");

// src/settings.ts
var import_obsidian2 = require("obsidian");

// src/api/anthropic-api.ts
var import_obsidian = require("obsidian");
var AnthropicApiClient = class {
  constructor(settings) {
    this.baseUrl = "https://api.anthropic.com/v1/messages";
    this.settings = settings;
  }
  async sendMessageStream(prompt, context, onChunk) {
    const response = await this.sendMessage(prompt, context);
    onChunk(response);
    return response;
  }
  async sendMessage(prompt, context) {
    if (!this.settings.apiKey) {
      throw new Error("API Key \u672A\u8A2D\u5B9A\uFF0C\u8ACB\u5728\u8A2D\u5B9A\u4E2D\u8F38\u5165\u60A8\u7684 Anthropic API Key");
    }
    const systemPrompt = buildSystemPrompt(this.settings);
    const userContent = context ? `${prompt}

---

${context}` : prompt;
    const requestBody = {
      model: this.settings.model,
      max_tokens: this.settings.maxTokens,
      messages: [
        {
          role: "user",
          content: userContent
        }
      ],
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
        throw new Error("\u56DE\u61C9\u5167\u5BB9\u70BA\u7A7A");
      }
      return data.content[0].text;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  async testConnection() {
    if (!this.settings.apiKey) {
      throw new Error("API Key \u672A\u8A2D\u5B9A");
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
        return new Error("API Key \u7121\u6548\uFF0C\u8ACB\u5728\u8A2D\u5B9A\u4E2D\u6AA2\u67E5");
      }
      if (message.includes("429") || message.includes("rate")) {
        return new Error("\u8ACB\u6C42\u904E\u65BC\u983B\u7E41\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66");
      }
      if (message.includes("500") || message.includes("502") || message.includes("503")) {
        return new Error("\u4F3A\u670D\u5668\u932F\u8AA4\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66");
      }
      if (message.includes("network") || message.includes("fetch") || message.includes("econnrefused")) {
        return new Error("\u7DB2\u8DEF\u9023\u7DDA\u5931\u6557\uFF0C\u8ACB\u6AA2\u67E5\u7DB2\u8DEF");
      }
      return error;
    }
    return new Error("\u767C\u751F\u672A\u77E5\u932F\u8AA4");
  }
};

// src/api/claude-code-cli.ts
var import_child_process = require("child_process");
var CLI_TIMEOUT = 12e4;
var ClaudeCodeClient = class {
  constructor(settings) {
    this.settings = settings;
  }
  async sendMessage(prompt, context) {
    return this.sendMessageStream(prompt, context, () => {
    });
  }
  async sendMessageStream(prompt, context, onChunk) {
    const systemPrompt = buildSystemPrompt(this.settings);
    const fullPrompt = context ? `${systemPrompt}

---

User request: ${prompt}

---

Content:
${context}` : `${systemPrompt}

---

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
      console.log("Clauwrite: Executing CLI command:", cliPath, args);
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

// src/api/claude.ts
function createClaudeClient(settings) {
  if (settings.authMode === "api-key") {
    return new AnthropicApiClient(settings);
  }
  return new ClaudeCodeClient(settings);
}
function buildSystemPrompt(settings) {
  const langInstruction = settings.responseLanguage === "zh-TW" ? "Respond in Traditional Chinese (\u7E41\u9AD4\u4E2D\u6587)." : "Respond in English.";
  return `${settings.prompts.system}
${langInstruction}`;
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
    "error.execError": "\u57F7\u884C\u932F\u8AA4: {message}"
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
    "error.execError": "Execution error: {message}"
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
  system: "You are an Obsidian note assistant. Help users with their notes.\nUse Markdown formatting. Keep responses concise and well-organized.",
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
  isFirstLoad: true
};
var AVAILABLE_MODELS = [
  { value: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", name: "Claude Opus 4" },
  { value: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { value: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" }
];
var ClauwriteSettingTab = class extends import_obsidian2.PluginSettingTab {
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
    containerEl.createEl("h2", { text: t("settings.title") });
    if (import_obsidian2.Platform.isDesktop) {
      this.renderAuthModeSection(containerEl);
    }
    this.apiKeySettingEl = containerEl.createDiv();
    this.renderApiKeySetting(this.apiKeySettingEl);
    if (import_obsidian2.Platform.isDesktop) {
      this.cliSettingEl = containerEl.createDiv();
      this.renderCliPathSetting(this.cliSettingEl);
      this.cliTestSettingEl = containerEl.createDiv();
      this.renderCliTestSetting(this.cliTestSettingEl);
    }
    this.updateAuthModeVisibility();
    containerEl.createEl("hr");
    containerEl.createEl("h3", { text: t("settings.model") });
    this.renderModelSetting(containerEl);
    this.renderMaxTokensSetting(containerEl);
    containerEl.createEl("hr");
    containerEl.createEl("h3", { text: t("settings.preferences") });
    this.renderUiLanguageSetting(containerEl);
    this.renderResponseLanguageSetting(containerEl);
    containerEl.createEl("hr");
    containerEl.createEl("h3", { text: t("settings.prompts") });
    this.renderPromptSettings(containerEl);
  }
  renderAuthModeSection(containerEl) {
    new import_obsidian2.Setting(containerEl).setName(t("settings.authMode")).setDesc(t("settings.authMode.desc")).addDropdown((dropdown) => {
      dropdown.addOption("api-key", t("settings.authMode.apiKey")).addOption("claude-code", t("settings.authMode.cli")).setValue(this.plugin.settings.authMode).onChange(async (value) => {
        this.plugin.settings.authMode = value;
        await this.plugin.saveSettings();
        this.updateAuthModeVisibility();
      });
    });
  }
  renderApiKeySetting(containerEl) {
    new import_obsidian2.Setting(containerEl).setName(t("settings.apiKey")).setDesc(t("settings.apiKey.desc")).addText((text) => {
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
    new import_obsidian2.Setting(containerEl).setName(t("settings.cliPath")).setDesc(descFragment).addText((text) => {
      text.setPlaceholder("/Users/user/.local/bin/claude").setValue(this.plugin.settings.claudeCodePath).onChange(async (value) => {
        this.plugin.settings.claudeCodePath = value || "claude";
        await this.plugin.saveSettings();
      });
    });
  }
  renderCliTestSetting(containerEl) {
    const setting = new import_obsidian2.Setting(containerEl).setName(t("settings.testConnection")).setDesc(t("settings.testConnection.desc"));
    const statusEl = containerEl.createSpan({ cls: "clauwrite-test-status" });
    setting.addButton((button) => {
      button.setButtonText(t("settings.testConnection.button")).onClick(async () => {
        statusEl.empty();
        statusEl.setText(t("settings.testConnection.testing"));
        button.setDisabled(true);
        try {
          const client = createClaudeClient(this.plugin.settings);
          const success = await client.testConnection();
          if (success) {
            statusEl.setText("\u2705 " + t("settings.testConnection.success"));
            statusEl.style.color = "var(--text-success)";
          } else {
            statusEl.setText("\u274C " + t("settings.testConnection.failed"));
            statusEl.style.color = "var(--text-error)";
          }
        } catch (error) {
          statusEl.setText(`\u274C ${error instanceof Error ? error.message : t("settings.testConnection.failed")}`);
          statusEl.style.color = "var(--text-error)";
        } finally {
          button.setDisabled(false);
        }
      });
    });
  }
  renderModelSetting(containerEl) {
    new import_obsidian2.Setting(containerEl).setName(t("settings.model.select")).setDesc(t("settings.model.desc")).addDropdown((dropdown) => {
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
    new import_obsidian2.Setting(containerEl).setName(t("settings.maxTokens")).setDesc(t("settings.maxTokens.desc")).addText((text) => {
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
    new import_obsidian2.Setting(containerEl).setName(t("settings.language")).setDesc(t("settings.language.desc")).addDropdown((dropdown) => {
      dropdown.addOption("zh-TW", "\u7E41\u9AD4\u4E2D\u6587").addOption("en", "English").setValue(this.plugin.settings.uiLanguage).onChange(async (value) => {
        this.plugin.settings.uiLanguage = value;
        setLanguage(value);
        await this.plugin.saveSettings();
        this.display();
      });
    });
  }
  renderResponseLanguageSetting(containerEl) {
    new import_obsidian2.Setting(containerEl).setName(t("settings.responseLanguage")).setDesc(t("settings.responseLanguage.desc")).addDropdown((dropdown) => {
      dropdown.addOption("zh-TW", "\u7E41\u9AD4\u4E2D\u6587").addOption("en", "English").setValue(this.plugin.settings.responseLanguage).onChange(async (value) => {
        this.plugin.settings.responseLanguage = value;
        await this.plugin.saveSettings();
      });
    });
  }
  renderPromptSettings(containerEl) {
    new import_obsidian2.Setting(containerEl).setName(t("settings.prompts.system")).setDesc(t("settings.prompts.system.desc")).addTextArea((text) => {
      text.setValue(this.plugin.settings.prompts.system).onChange(async (value) => {
        this.plugin.settings.prompts.system = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 3;
      text.inputEl.cols = 40;
    });
    new import_obsidian2.Setting(containerEl).setName(t("settings.prompts.summarize")).setDesc(t("settings.prompts.summarize.desc")).addTextArea((text) => {
      text.setValue(this.plugin.settings.prompts.summarize).onChange(async (value) => {
        this.plugin.settings.prompts.summarize = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 2;
      text.inputEl.cols = 40;
    });
    new import_obsidian2.Setting(containerEl).setName(t("settings.prompts.rewrite")).setDesc(t("settings.prompts.rewrite.desc")).addTextArea((text) => {
      text.setValue(this.plugin.settings.prompts.rewrite).onChange(async (value) => {
        this.plugin.settings.prompts.rewrite = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 2;
      text.inputEl.cols = 40;
    });
    new import_obsidian2.Setting(containerEl).setName(t("settings.prompts.ask")).setDesc(t("settings.prompts.ask.desc")).addTextArea((text) => {
      text.setValue(this.plugin.settings.prompts.ask).onChange(async (value) => {
        this.plugin.settings.prompts.ask = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 2;
      text.inputEl.cols = 40;
    });
    new import_obsidian2.Setting(containerEl).addButton((button) => {
      button.setButtonText(t("settings.prompts.reset")).onClick(async () => {
        this.plugin.settings.prompts = { ...DEFAULT_PROMPTS };
        await this.plugin.saveSettings();
        this.display();
      });
    });
  }
  updateAuthModeVisibility() {
    const isApiKeyMode = this.plugin.settings.authMode === "api-key" || import_obsidian2.Platform.isMobile;
    if (this.apiKeySettingEl) {
      this.apiKeySettingEl.style.display = isApiKeyMode ? "block" : "none";
    }
    if (this.cliSettingEl) {
      this.cliSettingEl.style.display = isApiKeyMode ? "none" : "block";
    }
    if (this.cliTestSettingEl) {
      this.cliTestSettingEl.style.display = isApiKeyMode ? "none" : "block";
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
var import_obsidian4 = require("obsidian");

// src/utils/context.ts
var import_obsidian3 = require("obsidian");
function getMarkdownView(app) {
  const activeView = app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
  if (activeView) {
    return activeView;
  }
  let markdownView = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (!markdownView && leaf.view instanceof import_obsidian3.MarkdownView) {
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
  const selection = editor.getSelection();
  if (selection) {
    return {
      content: selection,
      source: "\u9078\u53D6\u5167\u5BB9"
    };
  }
  const content = editor.getValue();
  if (!content) {
    return null;
  }
  return {
    content,
    source: (file == null ? void 0 : file.basename) || "\u7576\u524D\u7B46\u8A18"
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
var ChatView = class extends import_obsidian4.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.streamingMessageEl = null;
    this.streamingContentEl = null;
    this.messages = [];
    this.isLoading = false;
    this.lastSelectionContent = null;
    this.plugin = plugin;
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
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("clauwrite-chat-container");
    this.renderHeader(container);
    this.renderContextIndicator(container);
    this.renderMessages(container);
    this.renderInputArea(container);
    this.updateContextIndicator();
  }
  async onClose() {
    this.messages = [];
  }
  renderHeader(container) {
    const header = container.createDiv({ cls: "clauwrite-header" });
    header.createSpan({ cls: "clauwrite-header-title", text: t("chat.title") });
    const settingsIcon = header.createSpan({ cls: "clauwrite-header-settings" });
    (0, import_obsidian4.setIcon)(settingsIcon, "settings");
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
    this.loadingEl = this.messagesEl.createDiv({ cls: "clauwrite-loading" });
    this.loadingEl.style.display = "none";
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
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.sendButton = inputArea.createEl("button", {
      cls: "clauwrite-send-button",
      text: t("chat.send")
    });
    this.sendButton.addEventListener("click", () => {
      this.sendMessage();
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
  async sendMessage() {
    const message = this.inputEl.value.trim();
    if (!message || this.isLoading) {
      return;
    }
    this.updateContextIndicator();
    this.inputEl.value = "";
    this.addMessage("user", message);
    const context = getContext(this.app);
    await this.sendToClaudeStream(message, context == null ? void 0 : context.content);
  }
  async sendToClaudeStream(prompt, context, showReplaceButton = false) {
    this.setLoading(true);
    this.startStreamingMessage();
    let fullResponse = "";
    try {
      const client = createClaudeClient(this.plugin.settings);
      fullResponse = await client.sendMessageStream(prompt, context, (chunk) => {
        fullResponse += "";
        this.updateStreamingMessage(chunk);
      });
      this.finishStreamingMessage(fullResponse, showReplaceButton);
    } catch (error) {
      this.cancelStreamingMessage();
      const errorMessage = this.extractErrorMessage(error);
      this.addMessage("error", errorMessage);
    } finally {
      this.setLoading(false);
    }
  }
  async sendPromptWithContext(prompt, showReplaceButton = false) {
    this.addMessage("user", prompt);
    const context = getContext(this.app);
    if (showReplaceButton && (context == null ? void 0 : context.source) === "\u9078\u53D6\u5167\u5BB9") {
      this.lastSelectionContent = context.content;
    }
    await this.sendToClaudeStream(prompt, context == null ? void 0 : context.content, showReplaceButton);
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
    import_obsidian4.MarkdownRenderer.renderMarkdown(
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
        import_obsidian4.MarkdownRenderer.renderMarkdown(
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
    this.loadingEl.style.display = loading ? "flex" : "none";
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
};

// src/commands/summarize.ts
var import_obsidian5 = require("obsidian");
function registerSummarizeCommand(plugin) {
  plugin.addCommand({
    id: "summarize",
    name: t("command.summarize"),
    callback: async () => {
      const context = getContext(plugin.app);
      if (!context) {
        new import_obsidian5.Notice(t("notice.openNote"));
        return;
      }
      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new import_obsidian5.Notice(t("notice.cannotOpenChat"));
        return;
      }
      await chatView.sendPromptWithContext(plugin.settings.prompts.summarize);
    }
  });
}

// src/commands/rewrite.ts
var import_obsidian6 = require("obsidian");
function registerRewriteCommand(plugin) {
  plugin.addCommand({
    id: "rewrite",
    name: t("command.rewrite"),
    editorCallback: async (editor) => {
      const selection = editor.getSelection();
      if (!selection) {
        new import_obsidian6.Notice(t("notice.selectContent"));
        return;
      }
      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new import_obsidian6.Notice(t("notice.cannotOpenChat"));
        return;
      }
      await chatView.sendPromptWithContext(plugin.settings.prompts.rewrite, true);
    }
  });
}

// src/commands/ask.ts
var import_obsidian7 = require("obsidian");
var AskModal = class extends import_obsidian7.Modal {
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
        this.submitQuestion();
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
      this.submitQuestion();
    });
    setTimeout(() => textArea.focus(), 10);
  }
  async submitQuestion() {
    if (!this.question.trim()) {
      new import_obsidian7.Notice(t("notice.enterQuestion"));
      return;
    }
    this.close();
    const chatView = await this.plugin.activateChatView();
    if (!chatView) {
      new import_obsidian7.Notice(t("notice.cannotOpenChat"));
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
    callback: async () => {
      const context = getContext(plugin.app);
      if (!context) {
        new import_obsidian7.Notice(t("notice.openNote"));
        return;
      }
      new AskModal(plugin.app, plugin).open();
    }
  });
}

// src/main.ts
var ClauwritePlugin = class extends import_obsidian8.Plugin {
  async onload() {
    await this.loadSettings();
    setLanguage(this.settings.uiLanguage);
    this.registerView(
      CHAT_VIEW_TYPE,
      (leaf) => new ChatView(leaf, this)
    );
    this.addRibbonIcon("message-circle", "Clauwrite", () => {
      this.activateChatView();
    });
    this.registerCommands();
    this.addSettingTab(new ClauwriteSettingTab(this.app, this));
    if (this.settings.isFirstLoad) {
      await this.handleFirstLoad();
    }
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);
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
        this.activateChatView();
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
    if (import_obsidian8.Platform.isDesktop) {
      const cliAvailable = await this.detectClaudeCodeCli();
      if (cliAvailable) {
        this.settings.authMode = "claude-code";
        new import_obsidian8.Notice("Clauwrite: " + t("notice.cliDetected"));
      } else {
        this.settings.authMode = "api-key";
        new import_obsidian8.Notice("Clauwrite: " + t("notice.enterApiKey"));
      }
    } else {
      this.settings.authMode = "api-key";
      new import_obsidian8.Notice("Clauwrite: " + t("notice.mobileApiKey"));
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
