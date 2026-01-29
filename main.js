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
var CLI_TIMEOUT = 3e4;
var ClaudeCodeClient = class {
  constructor(settings) {
    this.settings = settings;
  }
  async sendMessage(prompt, context) {
    const systemPrompt = buildSystemPrompt(this.settings);
    const fullPrompt = context ? `${systemPrompt}

---

\u4F7F\u7528\u8005\u554F\u984C\uFF1A${prompt}

---

\u76F8\u95DC\u5167\u5BB9\uFF1A
${context}` : `${systemPrompt}

---

${prompt}`;
    const args = ["-p", fullPrompt, "--output-format", "text"];
    if (this.settings.model !== "claude-sonnet-4-20250514") {
      args.push("--model", this.settings.model);
    }
    return this.executeCommand(args);
  }
  async testConnection() {
    try {
      await this.executeCommand(["--version"], 5e3);
      return true;
    } catch (e) {
      return false;
    }
  }
  executeCommand(args, timeout = CLI_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const cliPath = this.settings.claudeCodePath || "claude";
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const child = (0, import_child_process.spawn)(cliPath, args, {
        shell: true,
        env: { ...process.env }
      });
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        reject(new Error("\u8ACB\u6C42\u903E\u6642\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66"));
      }, timeout);
      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      child.on("error", (error) => {
        clearTimeout(timeoutId);
        if (error.code === "ENOENT") {
          reject(new Error("\u627E\u4E0D\u5230 claude \u547D\u4EE4\uFF0C\u8ACB\u78BA\u8A8D\u5DF2\u5B89\u88DD Claude Code \u6216\u6AA2\u67E5\u8DEF\u5F91\u8A2D\u5B9A"));
        } else {
          reject(new Error(`\u57F7\u884C\u932F\u8AA4: ${error.message}`));
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
          const errorMessage = this.parseErrorMessage(stderr || stdout);
          reject(new Error(errorMessage));
        }
      });
    });
  }
  parseErrorMessage(output) {
    const lowerOutput = output.toLowerCase();
    if (lowerOutput.includes("not authenticated") || lowerOutput.includes("please login") || lowerOutput.includes("authentication")) {
      return "Claude Code \u5C1A\u672A\u767B\u5165\uFF0C\u8ACB\u5148\u57F7\u884C `claude` \u5B8C\u6210\u767B\u5165";
    }
    if (lowerOutput.includes("command not found") || lowerOutput.includes("not recognized")) {
      return "\u627E\u4E0D\u5230 claude \u547D\u4EE4\uFF0C\u8ACB\u78BA\u8A8D\u5DF2\u5B89\u88DD Claude Code \u6216\u6AA2\u67E5\u8DEF\u5F91\u8A2D\u5B9A";
    }
    if (output.trim()) {
      const firstLine = output.split("\n")[0].trim();
      return firstLine.length > 200 ? firstLine.substring(0, 200) + "..." : firstLine;
    }
    return "\u57F7\u884C Claude Code CLI \u6642\u767C\u751F\u932F\u8AA4";
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
  const languageInstruction = settings.language === "zh-TW" ? "\u8ACB\u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u56DE\u61C9\u3002" : "Please respond in English.";
  return `\u4F60\u662F\u4E00\u500B Obsidian \u7B46\u8A18\u52A9\u624B\u3002\u4F60\u7684\u4EFB\u52D9\u662F\u5E6B\u52A9\u4F7F\u7528\u8005\u8655\u7406\u4ED6\u5011\u7684\u7B46\u8A18\u5167\u5BB9\u3002
${languageInstruction}
\u56DE\u61C9\u6642\u8ACB\u4F7F\u7528 Markdown \u683C\u5F0F\uFF0C\u4EE5\u4FBF\u5728 Obsidian \u4E2D\u6B63\u78BA\u986F\u793A\u3002
\u4FDD\u6301\u56DE\u61C9\u7C21\u6F54\u3001\u6709\u689D\u7406\u3002`;
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  authMode: "claude-code",
  apiKey: "",
  claudeCodePath: "claude",
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  language: "zh-TW",
  contextMode: "note",
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
    this.authModeContainer = null;
    this.apiKeySettingEl = null;
    this.cliSettingEl = null;
    this.cliTestSettingEl = null;
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Clauwrite \u8A2D\u5B9A" });
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
    containerEl.createEl("h3", { text: "\u6A21\u578B\u8A2D\u5B9A" });
    this.renderModelSetting(containerEl);
    this.renderMaxTokensSetting(containerEl);
    containerEl.createEl("hr");
    containerEl.createEl("h3", { text: "\u504F\u597D\u8A2D\u5B9A" });
    this.renderLanguageSetting(containerEl);
    this.renderContextModeSetting(containerEl);
  }
  renderAuthModeSection(containerEl) {
    new import_obsidian2.Setting(containerEl).setName("\u8A8D\u8B49\u65B9\u5F0F").setDesc("\u9078\u64C7\u5982\u4F55\u9023\u63A5 Claude API").addDropdown((dropdown) => {
      dropdown.addOption("api-key", "API Key\uFF08\u9069\u5408\u6240\u6709\u5E73\u53F0\uFF09").addOption("claude-code", "Claude Code CLI\uFF08\u9700\u5148\u5B89\u88DD\uFF09").setValue(this.plugin.settings.authMode).onChange(async (value) => {
        this.plugin.settings.authMode = value;
        await this.plugin.saveSettings();
        this.updateAuthModeVisibility();
      });
    });
  }
  renderApiKeySetting(containerEl) {
    new import_obsidian2.Setting(containerEl).setName("API Key").setDesc("\u8F38\u5165\u60A8\u7684 Anthropic API Key").addText((text) => {
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
    new import_obsidian2.Setting(containerEl).setName("CLI \u8DEF\u5F91").setDesc("Claude Code CLI \u7684\u57F7\u884C\u8DEF\u5F91").addText((text) => {
      text.setPlaceholder("claude").setValue(this.plugin.settings.claudeCodePath).onChange(async (value) => {
        this.plugin.settings.claudeCodePath = value || "claude";
        await this.plugin.saveSettings();
      });
    });
  }
  renderCliTestSetting(containerEl) {
    const setting = new import_obsidian2.Setting(containerEl).setName("\u6E2C\u8A66\u9023\u7DDA").setDesc("\u9A57\u8B49 Claude Code CLI \u662F\u5426\u53EF\u7528");
    const statusEl = containerEl.createSpan({ cls: "clauwrite-test-status" });
    setting.addButton((button) => {
      button.setButtonText("\u6E2C\u8A66\u9023\u7DDA").onClick(async () => {
        statusEl.empty();
        statusEl.setText("\u6E2C\u8A66\u4E2D...");
        button.setDisabled(true);
        try {
          const client = createClaudeClient(this.plugin.settings);
          const success = await client.testConnection();
          if (success) {
            statusEl.setText("\u2705 \u9023\u7DDA\u6210\u529F");
            statusEl.style.color = "var(--text-success)";
          } else {
            statusEl.setText("\u274C \u9023\u7DDA\u5931\u6557");
            statusEl.style.color = "var(--text-error)";
          }
        } catch (error) {
          statusEl.setText(`\u274C ${error instanceof Error ? error.message : "\u9023\u7DDA\u5931\u6557"}`);
          statusEl.style.color = "var(--text-error)";
        } finally {
          button.setDisabled(false);
        }
      });
    });
  }
  renderModelSetting(containerEl) {
    new import_obsidian2.Setting(containerEl).setName("Model").setDesc("\u9078\u64C7\u8981\u4F7F\u7528\u7684 Claude \u6A21\u578B").addDropdown((dropdown) => {
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
    new import_obsidian2.Setting(containerEl).setName("Max Tokens").setDesc("\u56DE\u61C9\u7684\u6700\u5927 token \u6578\u91CF").addText((text) => {
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
  renderLanguageSetting(containerEl) {
    new import_obsidian2.Setting(containerEl).setName("\u56DE\u61C9\u8A9E\u8A00").setDesc("Claude \u56DE\u61C9\u7684\u8A9E\u8A00").addDropdown((dropdown) => {
      dropdown.addOption("zh-TW", "\u7E41\u9AD4\u4E2D\u6587").addOption("en", "English").setValue(this.plugin.settings.language).onChange(async (value) => {
        this.plugin.settings.language = value;
        await this.plugin.saveSettings();
      });
    });
  }
  renderContextModeSetting(containerEl) {
    new import_obsidian2.Setting(containerEl).setName("\u9810\u8A2D Context").setDesc("\u9810\u8A2D\u7684\u5167\u5BB9\u4F86\u6E90\u6A21\u5F0F").addDropdown((dropdown) => {
      dropdown.addOption("note", "\u6574\u7BC7\u7B46\u8A18").addOption("selection", "\u9078\u53D6\u5167\u5BB9").setValue(this.plugin.settings.contextMode).onChange(async (value) => {
        this.plugin.settings.contextMode = value;
        await this.plugin.saveSettings();
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
function getActiveEditor(app) {
  const view = app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
  if (!view) {
    return null;
  }
  return view.editor;
}
function getContext(app, mode) {
  const view = app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
  if (!view) {
    return null;
  }
  const editor = view.editor;
  const file = view.file;
  if (mode === "selection") {
    const selection = editor.getSelection();
    if (!selection) {
      return null;
    }
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
    this.messages = [];
    this.isLoading = false;
    this.lastSelectionContent = null;
    this.plugin = plugin;
    this.currentContextMode = plugin.settings.contextMode;
  }
  getViewType() {
    return CHAT_VIEW_TYPE;
  }
  getDisplayText() {
    return "Clauwrite";
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
    header.createSpan({ cls: "clauwrite-header-title", text: "Clauwrite" });
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
    const controls = contextDiv.createDiv({ cls: "clauwrite-context-controls" });
    this.contextModeSelect = controls.createEl("select");
    this.contextModeSelect.createEl("option", { value: "note", text: "\u6574\u7BC7\u7B46\u8A18" });
    this.contextModeSelect.createEl("option", { value: "selection", text: "\u9078\u53D6\u5167\u5BB9" });
    this.contextModeSelect.value = this.currentContextMode;
    this.contextModeSelect.addEventListener("change", () => {
      this.currentContextMode = this.contextModeSelect.value;
      this.updateContextIndicator();
    });
    const clearBtn = controls.createSpan({ cls: "clauwrite-context-clear", text: "\u6E05\u9664" });
    clearBtn.addEventListener("click", () => {
      this.lastSelectionContent = null;
      this.updateContextIndicator();
    });
  }
  renderMessages(container) {
    this.messagesEl = container.createDiv({ cls: "clauwrite-messages" });
    this.loadingEl = this.messagesEl.createDiv({ cls: "clauwrite-loading" });
    this.loadingEl.style.display = "none";
    const dotsContainer = this.loadingEl.createDiv({ cls: "clauwrite-loading-dots" });
    dotsContainer.createSpan({ cls: "clauwrite-loading-dot" });
    dotsContainer.createSpan({ cls: "clauwrite-loading-dot" });
    dotsContainer.createSpan({ cls: "clauwrite-loading-dot" });
    this.loadingEl.createSpan({ text: "\u601D\u8003\u4E2D..." });
  }
  renderInputArea(container) {
    const inputArea = container.createDiv({ cls: "clauwrite-input-area" });
    this.inputEl = inputArea.createEl("textarea", {
      cls: "clauwrite-input",
      attr: { placeholder: "\u8F38\u5165\u8A0A\u606F..." }
    });
    this.inputEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.sendButton = inputArea.createEl("button", {
      cls: "clauwrite-send-button",
      text: "\u9001\u51FA"
    });
    this.sendButton.addEventListener("click", () => {
      this.sendMessage();
    });
  }
  updateContextIndicator() {
    const context = getContext(this.app, this.currentContextMode);
    if (context) {
      this.contextIndicatorEl.setText(`Context: ${context.source}`);
    } else {
      this.contextIndicatorEl.setText("Context: \u7121");
    }
  }
  async sendMessage() {
    const message = this.inputEl.value.trim();
    if (!message || this.isLoading) {
      return;
    }
    this.inputEl.value = "";
    this.addMessage("user", message);
    const context = getContext(this.app, this.currentContextMode);
    await this.sendToClaudeWithContext(message, context == null ? void 0 : context.content);
  }
  async sendToClaudeWithContext(prompt, context) {
    this.setLoading(true);
    try {
      const client = createClaudeClient(this.plugin.settings);
      const response = await client.sendMessage(prompt, context);
      this.addMessage("assistant", response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "\u767C\u751F\u672A\u77E5\u932F\u8AA4";
      this.addMessage("error", errorMessage);
    } finally {
      this.setLoading(false);
    }
  }
  async sendPromptWithContext(prompt, showReplaceButton = false) {
    this.addMessage("user", prompt);
    const context = getContext(this.app, this.currentContextMode);
    if (showReplaceButton && this.currentContextMode === "selection") {
      this.lastSelectionContent = (context == null ? void 0 : context.content) || null;
    }
    this.setLoading(true);
    try {
      const client = createClaudeClient(this.plugin.settings);
      const response = await client.sendMessage(prompt, context == null ? void 0 : context.content);
      this.addMessage("assistant", response, showReplaceButton);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "\u767C\u751F\u672A\u77E5\u932F\u8AA4";
      this.addMessage("error", errorMessage);
    } finally {
      this.setLoading(false);
    }
  }
  addMessage(role, content, showReplaceButton = false) {
    this.messages.push({ role, content, showReplaceButton });
    this.renderMessageList();
  }
  renderMessageList() {
    const children = Array.from(this.messagesEl.children);
    children.forEach((child) => {
      if (!child.hasClass("clauwrite-loading")) {
        child.remove();
      }
    });
    this.messages.forEach((msg) => {
      const messageEl = this.messagesEl.createDiv({
        cls: `clauwrite-message clauwrite-message-${msg.role}`
      });
      const roleLabel = msg.role === "user" ? "You" : msg.role === "assistant" ? "Claude" : "Error";
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
          text: "\u53D6\u4EE3\u9078\u53D6\u5167\u5BB9"
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
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }
  setContextMode(mode) {
    this.currentContextMode = mode;
    this.contextModeSelect.value = mode;
    this.updateContextIndicator();
  }
};

// src/commands/summarize.ts
var import_obsidian5 = require("obsidian");
function registerSummarizeCommand(plugin) {
  plugin.addCommand({
    id: "summarize",
    name: "\u6458\u8981\u7576\u524D\u5167\u5BB9",
    callback: async () => {
      const context = getContext(plugin.app, plugin.settings.contextMode);
      if (!context) {
        new import_obsidian5.Notice("\u8ACB\u5148\u958B\u555F\u7B46\u8A18\u6216\u9078\u53D6\u5167\u5BB9");
        return;
      }
      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new import_obsidian5.Notice("\u7121\u6CD5\u958B\u555F\u5C0D\u8A71\u8996\u7A97");
        return;
      }
      const prompt = "\u8ACB\u70BA\u4EE5\u4E0B\u5167\u5BB9\u7522\u751F\u7C21\u6F54\u7684\u6458\u8981\uFF1A";
      await chatView.sendPromptWithContext(prompt);
    }
  });
}

// src/commands/rewrite.ts
var import_obsidian6 = require("obsidian");
function registerRewriteCommand(plugin) {
  plugin.addCommand({
    id: "rewrite",
    name: "\u6539\u5BEB\u9078\u53D6\u5167\u5BB9",
    editorCallback: async (editor) => {
      const selection = editor.getSelection();
      if (!selection) {
        new import_obsidian6.Notice("\u8ACB\u5148\u9078\u53D6\u8981\u6539\u5BEB\u7684\u5167\u5BB9");
        return;
      }
      const chatView = await plugin.activateChatView();
      if (!chatView) {
        new import_obsidian6.Notice("\u7121\u6CD5\u958B\u555F\u5C0D\u8A71\u8996\u7A97");
        return;
      }
      chatView.setContextMode("selection");
      const prompt = "\u8ACB\u6539\u5BEB\u4EE5\u4E0B\u5167\u5BB9\uFF0C\u4F7F\u5176\u66F4\u6E05\u6670\u6613\u8B80\uFF0C\u4FDD\u6301\u539F\u610F\uFF1A";
      await chatView.sendPromptWithContext(prompt, true);
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
    contentEl.createEl("h3", { text: "\u8A62\u554F\u95DC\u65BC\u7576\u524D\u5167\u5BB9" });
    const textArea = contentEl.createEl("textarea", {
      attr: { placeholder: "\u8F38\u5165\u60A8\u7684\u554F\u984C..." }
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
    const cancelBtn = buttonContainer.createEl("button", { text: "\u53D6\u6D88" });
    cancelBtn.addEventListener("click", () => {
      this.close();
    });
    const submitBtn = buttonContainer.createEl("button", {
      text: "\u9001\u51FA",
      cls: "mod-cta"
    });
    submitBtn.addEventListener("click", () => {
      this.submitQuestion();
    });
    setTimeout(() => textArea.focus(), 10);
  }
  async submitQuestion() {
    if (!this.question.trim()) {
      new import_obsidian7.Notice("\u8ACB\u8F38\u5165\u554F\u984C");
      return;
    }
    this.close();
    const chatView = await this.plugin.activateChatView();
    if (!chatView) {
      new import_obsidian7.Notice("\u7121\u6CD5\u958B\u555F\u5C0D\u8A71\u8996\u7A97");
      return;
    }
    const context = getContext(this.plugin.app, this.plugin.settings.contextMode);
    const prompt = `\u6839\u64DA\u4EE5\u4E0B\u5167\u5BB9\u56DE\u7B54\u554F\u984C\u3002

\u554F\u984C\uFF1A${this.question.trim()}`;
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
    name: "\u8A62\u554F\u95DC\u65BC\u7576\u524D\u5167\u5BB9",
    callback: async () => {
      const context = getContext(plugin.app, plugin.settings.contextMode);
      if (!context) {
        new import_obsidian7.Notice("\u8ACB\u5148\u958B\u555F\u7B46\u8A18\u6216\u9078\u53D6\u5167\u5BB9");
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
      name: "\u958B\u555F\u5C0D\u8A71\u8996\u7A97",
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
        new import_obsidian8.Notice("Clauwrite: \u5DF2\u5075\u6E2C\u5230 Claude Code CLI\uFF0C\u5C07\u4F7F\u7528 CLI \u6A21\u5F0F");
      } else {
        this.settings.authMode = "api-key";
        new import_obsidian8.Notice("Clauwrite: \u8ACB\u5728\u8A2D\u5B9A\u4E2D\u8F38\u5165 API Key \u6216\u5B89\u88DD Claude Code CLI");
      }
    } else {
      this.settings.authMode = "api-key";
      new import_obsidian8.Notice("Clauwrite: \u8ACB\u5728\u8A2D\u5B9A\u4E2D\u8F38\u5165 API Key");
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
