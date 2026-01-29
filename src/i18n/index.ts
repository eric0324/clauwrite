import type { Language } from '../settings';

const translations = {
  'zh-TW': {
    // Settings
    'settings.title': 'Clauwrite 設定',
    'settings.authMode': '認證方式',
    'settings.authMode.desc': '選擇如何連接 Claude API',
    'settings.authMode.apiKey': 'API Key（適合所有平台）',
    'settings.authMode.cli': 'Claude Code CLI（需先安裝）',
    'settings.apiKey': 'API Key',
    'settings.apiKey.desc': '輸入您的 Anthropic API Key',
    'settings.cliPath': 'CLI 路徑',
    'settings.cliPath.desc': 'Claude Code CLI 的執行路徑。',
    'settings.cliPath.hint': '可在終端機執行 {macCmd}（macOS/Linux）或 {winCmd}（Windows）來查詢路徑。',
    'settings.testConnection': '測試連線',
    'settings.testConnection.desc': '驗證 Claude Code CLI 是否可用',
    'settings.testConnection.button': '測試連線',
    'settings.testConnection.testing': '測試中...',
    'settings.testConnection.success': '連線成功',
    'settings.testConnection.failed': '連線失敗',
    'settings.model': '模型設定',
    'settings.model.select': 'Model',
    'settings.model.desc': '選擇要使用的 Claude 模型',
    'settings.maxTokens': 'Max Tokens',
    'settings.maxTokens.desc': '回應的最大 token 數量',
    'settings.preferences': '偏好設定',
    'settings.language': '介面語言',
    'settings.language.desc': '插件介面的顯示語言',
    'settings.responseLanguage': '回應語言',
    'settings.responseLanguage.desc': 'Claude 回應的語言',
    'settings.prompts': 'Prompt 模板',
    'settings.prompts.system': 'System Prompt',
    'settings.prompts.system.desc': '系統提示詞，定義 Claude 的角色和行為',
    'settings.prompts.summarize': '摘要 Prompt',
    'settings.prompts.summarize.desc': '摘要功能的提示詞',
    'settings.prompts.rewrite': '改寫 Prompt',
    'settings.prompts.rewrite.desc': '改寫功能的提示詞',
    'settings.prompts.ask': '詢問 Prompt',
    'settings.prompts.ask.desc': '詢問功能的提示詞，使用 {{question}} 代表問題',
    'settings.prompts.reset': '重設為預設',
    'settings.conversation': '對話設定',
    'settings.maxHistory': '歷史訊息數量',
    'settings.maxHistory.desc': '保留的對話歷史數量（每輪對話算 2 則）',
    'settings.clearHistory': '清除對話歷史',
    'settings.clearHistory.desc': '刪除所有儲存的對話記錄',
    'settings.clearHistory.button': '清除',
    'settings.clearHistory.done': '已清除對話歷史',

    // Chat View
    'chat.title': 'Clauwrite',
    'chat.context': 'Context',
    'chat.context.none': '無',
    'chat.context.selection': '選取內容',
    'chat.input.placeholder': '輸入訊息...',
    'chat.send': '送出',
    'chat.thinking': '思考中...',
    'chat.you': 'You',
    'chat.claude': 'Claude',
    'chat.error': 'Error',
    'chat.replace': '取代選取內容',
    'chat.newChat': '新對話',
    'chat.clearConfirm': '確定要清除對話歷史嗎？',
    'chat.fileUpdated': '檔案已更新',

    // Commands
    'command.openChat': '開啟對話視窗',
    'command.summarize': '摘要當前內容',
    'command.rewrite': '改寫選取內容',
    'command.ask': '詢問關於當前內容',

    // Prompts (always in English for Claude)
    'prompt.summarize': 'Please provide a concise summary of the following content:',
    'prompt.rewrite': 'Please rewrite the following content to be clearer and more readable while preserving the meaning:',
    'prompt.ask': 'Answer the question based on the following content.\n\nQuestion: {question}',
    'prompt.askModal.title': '詢問關於當前內容',
    'prompt.askModal.placeholder': '輸入您的問題...',
    'prompt.askModal.cancel': '取消',
    'prompt.askModal.submit': '送出',

    // Notices
    'notice.selectContent': '請先選取要改寫的內容',
    'notice.openNote': '請先開啟筆記或選取內容',
    'notice.cannotOpenChat': '無法開啟對話視窗',
    'notice.enterQuestion': '請輸入問題',
    'notice.cliDetected': '已偵測到 Claude Code CLI，將使用 CLI 模式',
    'notice.enterApiKey': '請在設定中輸入 API Key 或安裝 Claude Code CLI',
    'notice.mobileApiKey': '請在設定中輸入 API Key',

    // Errors
    'error.unknown': '發生未知錯誤，請檢查開發者工具的 Console 以獲取詳細資訊',
    'error.timeout': '請求逾時，請稍後再試',
    'error.cliNotFound': '找不到 claude 命令，請確認已安裝 Claude Code 或檢查路徑設定',
    'error.notAuthenticated': 'Claude Code 尚未登入，請先執行 `claude` 完成登入',
    'error.cliError': '執行 Claude Code CLI 時發生錯誤',
    'error.cliExitCode': 'CLI 返回錯誤碼: {code}',
    'error.execError': '執行錯誤: {message}',
    'error.noActiveFile': '找不到開啟的檔案',
    'error.editFailed': '編輯檔案失敗',
  },

  'en': {
    // Settings
    'settings.title': 'Clauwrite Settings',
    'settings.authMode': 'Authentication',
    'settings.authMode.desc': 'Choose how to connect to Claude API',
    'settings.authMode.apiKey': 'API Key (works on all platforms)',
    'settings.authMode.cli': 'Claude Code CLI (requires installation)',
    'settings.apiKey': 'API Key',
    'settings.apiKey.desc': 'Enter your Anthropic API Key',
    'settings.cliPath': 'CLI Path',
    'settings.cliPath.desc': 'Path to Claude Code CLI executable.',
    'settings.cliPath.hint': 'Run {macCmd} (macOS/Linux) or {winCmd} (Windows) in terminal to find the path.',
    'settings.testConnection': 'Test Connection',
    'settings.testConnection.desc': 'Verify Claude Code CLI is available',
    'settings.testConnection.button': 'Test',
    'settings.testConnection.testing': 'Testing...',
    'settings.testConnection.success': 'Connected',
    'settings.testConnection.failed': 'Failed',
    'settings.model': 'Model Settings',
    'settings.model.select': 'Model',
    'settings.model.desc': 'Select the Claude model to use',
    'settings.maxTokens': 'Max Tokens',
    'settings.maxTokens.desc': 'Maximum tokens in response',
    'settings.preferences': 'Preferences',
    'settings.language': 'Interface Language',
    'settings.language.desc': 'Language for plugin interface',
    'settings.responseLanguage': 'Response Language',
    'settings.responseLanguage.desc': 'Language for Claude responses',
    'settings.prompts': 'Prompt Templates',
    'settings.prompts.system': 'System Prompt',
    'settings.prompts.system.desc': 'System prompt that defines Claude\'s role and behavior',
    'settings.prompts.summarize': 'Summarize Prompt',
    'settings.prompts.summarize.desc': 'Prompt for summarize function',
    'settings.prompts.rewrite': 'Rewrite Prompt',
    'settings.prompts.rewrite.desc': 'Prompt for rewrite function',
    'settings.prompts.ask': 'Ask Prompt',
    'settings.prompts.ask.desc': 'Prompt for ask function, use {{question}} as placeholder',
    'settings.prompts.reset': 'Reset to Default',
    'settings.conversation': 'Conversation',
    'settings.maxHistory': 'History Length',
    'settings.maxHistory.desc': 'Number of messages to keep in history (each round = 2 messages)',
    'settings.clearHistory': 'Clear History',
    'settings.clearHistory.desc': 'Delete all saved conversation history',
    'settings.clearHistory.button': 'Clear',
    'settings.clearHistory.done': 'Conversation history cleared',

    // Chat View
    'chat.title': 'Clauwrite',
    'chat.context': 'Context',
    'chat.context.none': 'None',
    'chat.context.selection': 'Selection',
    'chat.input.placeholder': 'Type a message...',
    'chat.send': 'Send',
    'chat.thinking': 'Thinking...',
    'chat.you': 'You',
    'chat.claude': 'Claude',
    'chat.error': 'Error',
    'chat.replace': 'Replace Selection',
    'chat.newChat': 'New Chat',
    'chat.clearConfirm': 'Clear conversation history?',
    'chat.fileUpdated': 'File updated',

    // Commands
    'command.openChat': 'Open Chat',
    'command.summarize': 'Summarize Content',
    'command.rewrite': 'Rewrite Selection',
    'command.ask': 'Ask About Content',

    // Prompts
    'prompt.summarize': 'Please provide a concise summary of the following content:',
    'prompt.rewrite': 'Please rewrite the following content to be clearer and more readable while preserving the meaning:',
    'prompt.ask': 'Answer the question based on the following content.\n\nQuestion: {question}',
    'prompt.askModal.title': 'Ask About Content',
    'prompt.askModal.placeholder': 'Enter your question...',
    'prompt.askModal.cancel': 'Cancel',
    'prompt.askModal.submit': 'Submit',

    // Notices
    'notice.selectContent': 'Please select content to rewrite',
    'notice.openNote': 'Please open a note or select content',
    'notice.cannotOpenChat': 'Cannot open chat window',
    'notice.enterQuestion': 'Please enter a question',
    'notice.cliDetected': 'Claude Code CLI detected, using CLI mode',
    'notice.enterApiKey': 'Please enter API Key in settings or install Claude Code CLI',
    'notice.mobileApiKey': 'Please enter API Key in settings',

    // Errors
    'error.unknown': 'Unknown error occurred. Check Console in developer tools for details',
    'error.timeout': 'Request timed out, please try again',
    'error.cliNotFound': 'Cannot find claude command. Please install Claude Code or check path settings',
    'error.notAuthenticated': 'Claude Code not logged in. Please run `claude` to login first',
    'error.cliError': 'Error executing Claude Code CLI',
    'error.cliExitCode': 'CLI returned error code: {code}',
    'error.execError': 'Execution error: {message}',
    'error.noActiveFile': 'No active file found',
    'error.editFailed': 'Failed to edit file',
  },
} as const;

type TranslationKey = keyof typeof translations['zh-TW'];

let currentLanguage: Language = 'zh-TW';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function t(key: TranslationKey, params?: Record<string, string>): string {
  let text = translations[currentLanguage][key] || translations['zh-TW'][key] || key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }

  return text;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}
