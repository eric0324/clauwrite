import { Plugin, Notice, Platform, WorkspaceLeaf } from 'obsidian';
import { ClauwriteSettings, ClauwriteSettingTab, DEFAULT_SETTINGS } from './settings';
import { ChatView, CHAT_VIEW_TYPE } from './views/ChatView';
import { registerSummarizeCommand } from './commands/summarize';
import { registerRewriteCommand } from './commands/rewrite';
import { registerAskCommand } from './commands/ask';
import { ClaudeCodeClient } from './api/claude-code-cli';
import { setLanguage, t } from './i18n';

export default class ClauwritePlugin extends Plugin {
  settings: ClauwriteSettings;

  async onload(): Promise<void> {
    // Load settings
    await this.loadSettings();

    // Initialize language
    setLanguage(this.settings.uiLanguage);

    // Register Chat View
    this.registerView(
      CHAT_VIEW_TYPE,
      (leaf) => new ChatView(leaf, this)
    );

    // Register ribbon icon
    this.addRibbonIcon('message-circle', 'Clauwrite', () => {
      this.activateChatView();
    });

    // Register commands
    this.registerCommands();

    // Register settings tab
    this.addSettingTab(new ClauwriteSettingTab(this.app, this));

    // First load: auto-detect Claude Code CLI and show notice
    if (this.settings.isFirstLoad) {
      await this.handleFirstLoad();
    }
  }

  onunload(): void {
    // Detach all Chat View leaves
    this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private registerCommands(): void {
    // Open Chat command
    this.addCommand({
      id: 'open-chat',
      name: t('command.openChat'),
      callback: () => {
        this.activateChatView();
      },
    });

    // Register other commands
    registerSummarizeCommand(this);
    registerRewriteCommand(this);
    registerAskCommand(this);
  }

  async activateChatView(): Promise<ChatView | null> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(CHAT_VIEW_TYPE);

    if (leaves.length > 0) {
      // View already exists, reveal it
      leaf = leaves[0];
    } else {
      // Create new view in right sidebar
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: CHAT_VIEW_TYPE,
          active: true,
        });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
      return leaf.view as ChatView;
    }

    return null;
  }

  private async handleFirstLoad(): Promise<void> {
    // Only attempt CLI detection on desktop
    if (Platform.isDesktop) {
      const cliAvailable = await this.detectClaudeCodeCli();

      if (cliAvailable) {
        this.settings.authMode = 'claude-code';
        new Notice('Clauwrite: ' + t('notice.cliDetected'));
      } else {
        this.settings.authMode = 'api-key';
        new Notice('Clauwrite: ' + t('notice.enterApiKey'));
      }
    } else {
      // Mobile: force API key mode
      this.settings.authMode = 'api-key';
      new Notice('Clauwrite: ' + t('notice.mobileApiKey'));
    }

    // Mark first load as complete
    this.settings.isFirstLoad = false;
    await this.saveSettings();
  }

  private async detectClaudeCodeCli(): Promise<boolean> {
    try {
      const tempSettings = { ...this.settings, claudeCodePath: 'claude' };
      const client = new ClaudeCodeClient(tempSettings);
      return await client.testConnection();
    } catch {
      return false;
    }
  }
}
