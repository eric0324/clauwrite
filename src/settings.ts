import { App, Platform, PluginSettingTab, Setting, Notice } from 'obsidian';
import type ClauwritePlugin from './main';
import { createClaudeClient } from './api/claude';

export type AuthMode = 'api-key' | 'claude-code';
export type Language = 'zh-TW' | 'en';
export type ContextMode = 'note' | 'selection';

export interface ClauwriteSettings {
  authMode: AuthMode;
  apiKey: string;
  claudeCodePath: string;
  model: string;
  maxTokens: number;
  language: Language;
  contextMode: ContextMode;
  isFirstLoad: boolean;
}

export const DEFAULT_SETTINGS: ClauwriteSettings = {
  authMode: 'claude-code',
  apiKey: '',
  claudeCodePath: 'claude',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  language: 'zh-TW',
  contextMode: 'note',
  isFirstLoad: true,
};

const AVAILABLE_MODELS = [
  { value: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { value: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
];

export class ClauwriteSettingTab extends PluginSettingTab {
  plugin: ClauwritePlugin;
  private authModeContainer: HTMLElement | null = null;
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

    containerEl.createEl('h2', { text: 'Clauwrite 設定' });

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

    // Separator
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '模型設定' });

    // Model Selection
    this.renderModelSetting(containerEl);

    // Max Tokens
    this.renderMaxTokensSetting(containerEl);

    // Separator
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '偏好設定' });

    // Language
    this.renderLanguageSetting(containerEl);

    // Context Mode
    this.renderContextModeSetting(containerEl);
  }

  private renderAuthModeSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('認證方式')
      .setDesc('選擇如何連接 Claude API')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('api-key', 'API Key（適合所有平台）')
          .addOption('claude-code', 'Claude Code CLI（需先安裝）')
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
      .setName('API Key')
      .setDesc('輸入您的 Anthropic API Key')
      .addText((text) => {
        text
          .setPlaceholder('sk-ant-...')
          .setValue(this.maskApiKey(this.plugin.settings.apiKey))
          .onChange(async (value) => {
            // Only update if it's a real change (not masked value)
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
    new Setting(containerEl)
      .setName('CLI 路徑')
      .setDesc('Claude Code CLI 的執行路徑')
      .addText((text) => {
        text
          .setPlaceholder('claude')
          .setValue(this.plugin.settings.claudeCodePath)
          .onChange(async (value) => {
            this.plugin.settings.claudeCodePath = value || 'claude';
            await this.plugin.saveSettings();
          });
      });
  }

  private renderCliTestSetting(containerEl: HTMLElement): void {
    const setting = new Setting(containerEl)
      .setName('測試連線')
      .setDesc('驗證 Claude Code CLI 是否可用');

    const statusEl = containerEl.createSpan({ cls: 'clauwrite-test-status' });

    setting.addButton((button) => {
      button.setButtonText('測試連線').onClick(async () => {
        statusEl.empty();
        statusEl.setText('測試中...');
        button.setDisabled(true);

        try {
          const client = createClaudeClient(this.plugin.settings);
          const success = await client.testConnection();
          if (success) {
            statusEl.setText('✅ 連線成功');
            statusEl.style.color = 'var(--text-success)';
          } else {
            statusEl.setText('❌ 連線失敗');
            statusEl.style.color = 'var(--text-error)';
          }
        } catch (error) {
          statusEl.setText(`❌ ${error instanceof Error ? error.message : '連線失敗'}`);
          statusEl.style.color = 'var(--text-error)';
        } finally {
          button.setDisabled(false);
        }
      });
    });
  }

  private renderModelSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('Model')
      .setDesc('選擇要使用的 Claude 模型')
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
      .setName('Max Tokens')
      .setDesc('回應的最大 token 數量')
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

  private renderLanguageSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('回應語言')
      .setDesc('Claude 回應的語言')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('zh-TW', '繁體中文')
          .addOption('en', 'English')
          .setValue(this.plugin.settings.language)
          .onChange(async (value: Language) => {
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderContextModeSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('預設 Context')
      .setDesc('預設的內容來源模式')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('note', '整篇筆記')
          .addOption('selection', '選取內容')
          .setValue(this.plugin.settings.contextMode)
          .onChange(async (value: ContextMode) => {
            this.plugin.settings.contextMode = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private updateAuthModeVisibility(): void {
    const isApiKeyMode = this.plugin.settings.authMode === 'api-key' || Platform.isMobile;

    if (this.apiKeySettingEl) {
      this.apiKeySettingEl.style.display = isApiKeyMode ? 'block' : 'none';
    }
    if (this.cliSettingEl) {
      this.cliSettingEl.style.display = isApiKeyMode ? 'none' : 'block';
    }
    if (this.cliTestSettingEl) {
      this.cliTestSettingEl.style.display = isApiKeyMode ? 'none' : 'block';
    }
  }

  private maskApiKey(apiKey: string): string {
    if (!apiKey) return '';
    if (apiKey.length <= 10) return '••••••••';
    return apiKey.substring(0, 7) + '••••••••' + apiKey.substring(apiKey.length - 4);
  }
}
