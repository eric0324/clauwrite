import { App, Platform, PluginSettingTab, Setting, Notice } from 'obsidian';
import type ClauwritePlugin from './main';
import { createClaudeClient } from './api/claude';
import { t, setLanguage } from './i18n';

export type AuthMode = 'api-key' | 'claude-code';
export type Language = 'zh-TW' | 'en';

export interface PromptTemplates {
  system: string;
  summarize: string;
  rewrite: string;
  ask: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ClauwriteSettings {
  authMode: AuthMode;
  apiKey: string;
  claudeCodePath: string;
  model: string;
  maxTokens: number;
  uiLanguage: Language;
  responseLanguage: Language;
  prompts: PromptTemplates;
  maxHistoryLength: number;
  conversationHistory: ConversationMessage[];
  isFirstLoad: boolean;
  agenticMode: boolean;
}

export const DEFAULT_PROMPTS: PromptTemplates = {
  system: `You are an Obsidian note assistant. Help users with their notes.
Use Markdown formatting. Keep responses concise and well-organized.

When the user asks you to edit or modify the current file, respond with the complete new content wrapped in:
<<<APPLY_EDIT>>>
(new file content here)
<<<END_EDIT>>>

Only use this format when the user explicitly asks to modify/edit/update the file. For questions or discussions, respond normally.`,
  summarize: 'Please provide a concise summary of the following content:',
  rewrite: 'Please rewrite the following content to be clearer and more readable while preserving the meaning:',
  ask: 'Answer the question based on the following content.\n\nQuestion: {{question}}',
};

export const DEFAULT_SETTINGS: ClauwriteSettings = {
  authMode: 'claude-code',
  apiKey: '',
  claudeCodePath: 'claude',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  uiLanguage: 'zh-TW',
  responseLanguage: 'zh-TW',
  prompts: { ...DEFAULT_PROMPTS },
  maxHistoryLength: 20,
  conversationHistory: [],
  isFirstLoad: true,
  agenticMode: false,
};

const AVAILABLE_MODELS = [
  { value: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { value: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
];

export class ClauwriteSettingTab extends PluginSettingTab {
  plugin: ClauwritePlugin;
  private apiKeySettingEl: HTMLElement | null = null;
  private cliSettingEl: HTMLElement | null = null;
  private cliTestSettingEl: HTMLElement | null = null;

  constructor(app: App, plugin: ClauwritePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(t('settings.title')).setHeading();

    // Auth Mode Section (hidden on mobile)
    if (Platform.isDesktop) {
      this.renderAuthModeSection(containerEl);
    }

    // API Key Setting
    this.apiKeySettingEl = containerEl.createDiv();
    this.renderApiKeySetting(this.apiKeySettingEl);

    // Claude Code CLI Settings
    if (Platform.isDesktop) {
      this.cliSettingEl = containerEl.createDiv();
      this.renderCliPathSetting(this.cliSettingEl);

      this.cliTestSettingEl = containerEl.createDiv();
      this.renderCliTestSetting(this.cliTestSettingEl);
    }

    // Update visibility based on auth mode
    this.updateAuthModeVisibility();

    // Model section
    new Setting(containerEl).setName(t('settings.model')).setHeading();

    // Model Selection
    this.renderModelSetting(containerEl);

    // Max Tokens
    this.renderMaxTokensSetting(containerEl);

    // Preferences section
    new Setting(containerEl).setName(t('settings.preferences')).setHeading();

    // UI Language
    this.renderUiLanguageSetting(containerEl);

    // Response Language
    this.renderResponseLanguageSetting(containerEl);

    // Agentic section
    new Setting(containerEl).setName(t('settings.agentic')).setHeading();

    // Agentic Mode
    this.renderAgenticModeSetting(containerEl);

    // Prompts section
    new Setting(containerEl).setName(t('settings.prompts')).setHeading();

    // Prompt Templates
    this.renderPromptSettings(containerEl);

    // Conversation section
    new Setting(containerEl).setName(t('settings.conversation')).setHeading();

    // Conversation Settings
    this.renderConversationSettings(containerEl);
  }

  private renderAuthModeSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('settings.authMode'))
      .setDesc(t('settings.authMode.desc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('api-key', t('settings.authMode.apiKey'))
          .addOption('claude-code', t('settings.authMode.cli'))
          .setValue(this.plugin.settings.authMode)
          .onChange(async (value: AuthMode) => {
            this.plugin.settings.authMode = value;
            await this.plugin.saveSettings();
            this.updateAuthModeVisibility();
          });
      });
  }

  private renderApiKeySetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('settings.apiKey'))
      .setDesc(t('settings.apiKey.desc'))
      .addText((text) => {
        text
          // eslint-disable-next-line obsidianmd/ui/sentence-case -- API key format
          .setPlaceholder('sk-ant-...')
          .setValue(this.maskApiKey(this.plugin.settings.apiKey))
          .onChange(async (value) => {
            if (!value.includes('••••')) {
              this.plugin.settings.apiKey = value;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'password';
        text.inputEl.addEventListener('focus', () => {
          if (this.plugin.settings.apiKey) {
            text.setValue(this.plugin.settings.apiKey);
          }
        });
        text.inputEl.addEventListener('blur', () => {
          text.setValue(this.maskApiKey(this.plugin.settings.apiKey));
        });
      });
  }

  private renderCliPathSetting(containerEl: HTMLElement): void {
    const descFragment = document.createDocumentFragment();
    descFragment.appendText(t('settings.cliPath.desc'));
    descFragment.createEl('br');

    const hintText = t('settings.cliPath.hint', { macCmd: '', winCmd: '' });
    const parts = hintText.split(/\{macCmd\}|\{winCmd\}/);

    descFragment.appendText(parts[0] || '');
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- shell command
    descFragment.createEl('code', { text: 'which claude' });
    descFragment.appendText(parts[1] || '');
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- shell command
    descFragment.createEl('code', { text: 'where claude' });
    descFragment.appendText(parts[2] || '');

    new Setting(containerEl)
      .setName(t('settings.cliPath'))
      .setDesc(descFragment)
      .addText((text) => {
        text
          // eslint-disable-next-line obsidianmd/ui/sentence-case -- file path
          .setPlaceholder('/Users/user/.local/bin/claude')
          .setValue(this.plugin.settings.claudeCodePath)
          .onChange(async (value) => {
            this.plugin.settings.claudeCodePath = value || 'claude';
            await this.plugin.saveSettings();
          });
      });
  }

  private renderCliTestSetting(containerEl: HTMLElement): void {
    const setting = new Setting(containerEl)
      .setName(t('settings.testConnection'))
      .setDesc(t('settings.testConnection.desc'));

    const statusEl = containerEl.createSpan({ cls: 'clauwrite-test-status' });

    setting.addButton((button) => {
      button.setButtonText(t('settings.testConnection.button')).onClick(async () => {
        statusEl.empty();
        statusEl.removeClass('clauwrite-test-status-success', 'clauwrite-test-status-error');
        statusEl.setText(t('settings.testConnection.testing'));
        button.setDisabled(true);

        try {
          const client = createClaudeClient(this.plugin.settings);
          const success = await client.testConnection();
          if (success) {
            statusEl.setText('✅ ' + t('settings.testConnection.success'));
            statusEl.addClass('clauwrite-test-status-success');
          } else {
            statusEl.setText('❌ ' + t('settings.testConnection.failed'));
            statusEl.addClass('clauwrite-test-status-error');
          }
        } catch (error) {
          statusEl.setText(`❌ ${error instanceof Error ? error.message : t('settings.testConnection.failed')}`);
          statusEl.addClass('clauwrite-test-status-error');
        } finally {
          button.setDisabled(false);
        }
      });
    });
  }

  private renderModelSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('settings.model.select'))
      .setDesc(t('settings.model.desc'))
      .addDropdown((dropdown) => {
        AVAILABLE_MODELS.forEach((model) => {
          dropdown.addOption(model.value, model.name);
        });
        dropdown
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderMaxTokensSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('settings.maxTokens'))
      .setDesc(t('settings.maxTokens.desc'))
      .addText((text) => {
        text
          .setPlaceholder('4096')
          .setValue(String(this.plugin.settings.maxTokens))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.maxTokens = num;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '1';
        text.inputEl.max = '8192';
      });
  }

  private renderUiLanguageSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('settings.language'))
      .setDesc(t('settings.language.desc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('zh-TW', '繁體中文')
          .addOption('en', 'English')
          .setValue(this.plugin.settings.uiLanguage)
          .onChange(async (value: Language) => {
            this.plugin.settings.uiLanguage = value;
            setLanguage(value);
            await this.plugin.saveSettings();
            // Refresh the settings display
            this.display();
          });
      });
  }

  private renderResponseLanguageSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('settings.responseLanguage'))
      .setDesc(t('settings.responseLanguage.desc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('zh-TW', '繁體中文')
          .addOption('en', 'English')
          .setValue(this.plugin.settings.responseLanguage)
          .onChange(async (value: Language) => {
            this.plugin.settings.responseLanguage = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderPromptSettings(containerEl: HTMLElement): void {
    // System Prompt
    new Setting(containerEl)
      .setName(t('settings.prompts.system'))
      .setDesc(t('settings.prompts.system.desc'))
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.prompts.system)
          .onChange(async (value) => {
            this.plugin.settings.prompts.system = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 3;
        text.inputEl.cols = 40;
      });

    // Summarize Prompt
    new Setting(containerEl)
      .setName(t('settings.prompts.summarize'))
      .setDesc(t('settings.prompts.summarize.desc'))
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.prompts.summarize)
          .onChange(async (value) => {
            this.plugin.settings.prompts.summarize = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 2;
        text.inputEl.cols = 40;
      });

    // Rewrite Prompt
    new Setting(containerEl)
      .setName(t('settings.prompts.rewrite'))
      .setDesc(t('settings.prompts.rewrite.desc'))
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.prompts.rewrite)
          .onChange(async (value) => {
            this.plugin.settings.prompts.rewrite = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 2;
        text.inputEl.cols = 40;
      });

    // Ask Prompt
    new Setting(containerEl)
      .setName(t('settings.prompts.ask'))
      .setDesc(t('settings.prompts.ask.desc'))
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.prompts.ask)
          .onChange(async (value) => {
            this.plugin.settings.prompts.ask = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 2;
        text.inputEl.cols = 40;
      });

    // Reset Button
    new Setting(containerEl)
      .addButton((button) => {
        button
          .setButtonText(t('settings.prompts.reset'))
          .onClick(async () => {
            this.plugin.settings.prompts = { ...DEFAULT_PROMPTS };
            await this.plugin.saveSettings();
            this.display();
          });
      });
  }

  private renderAgenticModeSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t('settings.agentic.enable'))
      .setDesc(t('settings.agentic.desc'))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.agenticMode)
          .onChange(async (value) => {
            this.plugin.settings.agenticMode = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderConversationSettings(containerEl: HTMLElement): void {
    // Max History Length
    new Setting(containerEl)
      .setName(t('settings.maxHistory'))
      .setDesc(t('settings.maxHistory.desc'))
      .addText((text) => {
        text
          .setPlaceholder('20')
          .setValue(String(this.plugin.settings.maxHistoryLength))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num >= 0) {
              this.plugin.settings.maxHistoryLength = num;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '0';
        text.inputEl.max = '100';
      });

    // Clear History
    new Setting(containerEl)
      .setName(t('settings.clearHistory'))
      .setDesc(t('settings.clearHistory.desc'))
      .addButton((button) => {
        button
          .setButtonText(t('settings.clearHistory.button'))
          .onClick(async () => {
            this.plugin.settings.conversationHistory = [];
            await this.plugin.saveSettings();
            new Notice(t('settings.clearHistory.done'));
          });
      });
  }

  private updateAuthModeVisibility(): void {
    const isApiKeyMode = this.plugin.settings.authMode === 'api-key' || Platform.isMobile;

    if (this.apiKeySettingEl) {
      this.apiKeySettingEl.toggleClass('clauwrite-hidden', !isApiKeyMode);
    }
    if (this.cliSettingEl) {
      this.cliSettingEl.toggleClass('clauwrite-hidden', isApiKeyMode);
    }
    if (this.cliTestSettingEl) {
      this.cliTestSettingEl.toggleClass('clauwrite-hidden', isApiKeyMode);
    }
  }

  private maskApiKey(apiKey: string): string {
    if (!apiKey) return '';
    if (apiKey.length <= 10) return '••••••••';
    return apiKey.substring(0, 7) + '••••••••' + apiKey.substring(apiKey.length - 4);
  }
}
