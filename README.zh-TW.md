# Clauwrite

整合 Claude AI 的 Obsidian 外掛，幫助你寫作、編輯和管理筆記。

[English](./README.md)

## 功能特色

### 對話介面
- **AI 對話**：直接在 Obsidian 中與 Claude 聊天
- **上下文感知**：自動將當前筆記或選取文字作為上下文
- **對話歷史**：跨 session 保存對話記錄
- **串流回應**：即時顯示 Claude 的回應

### 快速指令
- **摘要**：生成筆記或選取文字的精簡摘要
- **改寫**：改善文字的清晰度和可讀性
- **詢問**：針對當前內容提問

### 檔案編輯
- **直接編輯**：Claude 可以直接修改你的當前檔案
- 使用 `<<<APPLY_EDIT>>>` 區塊進行安全、明確的檔案修改

### Agentic 模式（新功能）
讓 Claude 自主操作你的整個 Vault：

| 工具 | 說明 |
|------|------|
| `read_note` | 讀取任何筆記的內容 |
| `write_note` | 創建或更新筆記 |
| `list_notes` | 列出資料夾或整個 Vault 的筆記 |
| `search_notes` | 依內容搜尋筆記 |
| `create_folder` | 創建新資料夾 |

## 安裝

### 從 Obsidian 社群外掛
1. 開啟設定 → 社群外掛
2. 搜尋 "Clauwrite"
3. 安裝並啟用

### 手動安裝
1. 下載最新版本
2. 解壓縮到 `.obsidian/plugins/clauwrite/`
3. 在設定 → 社群外掛中啟用

## 設定

### 認證方式
選擇以下其中一種認證方式：

**API Key（所有平台）**
- 從 [Anthropic Console](https://console.anthropic.com/) 取得 API Key
- 在設定 → Clauwrite → API Key 中輸入

**Claude Code CLI（僅桌面版）**
- 安裝 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- 執行 `claude` 完成認證
- 外掛會自動偵測並使用 CLI

### 設定選項

| 設定 | 說明 |
|------|------|
| 模型 | 選擇 Claude 模型（Sonnet 4、Opus 4 等） |
| Max Tokens | 回應的最大長度 |
| 介面語言 | 介面顯示語言（English/繁體中文） |
| 回應語言 | Claude 回應的語言 |
| Agentic 模式 | 啟用跨筆記操作功能 |
| 歷史長度 | 保留的對話訊息數量 |

### Prompt 模板
可自訂以下 prompt：
- System Prompt（Claude 的行為設定）
- 摘要 Prompt
- 改寫 Prompt
- 詢問 Prompt

## 使用方式

### 基本對話
1. 開啟對話面板（點擊側邊欄的訊息圖示）
2. 輸入訊息並按 Enter
3. Claude 會根據當前筆記的上下文回應

### 使用指令
透過命令面板（`Cmd/Ctrl + P`）存取：
- `Clauwrite: 開啟對話視窗`
- `Clauwrite: 摘要當前內容`
- `Clauwrite: 改寫選取內容`
- `Clauwrite: 詢問關於當前內容`

### 檔案編輯
請 Claude 修改你的當前檔案：
```
「幫這篇筆記加上目錄」
「修正這份文件的格式」
「把這篇筆記翻譯成英文」
```
Claude 會顯示變更內容並自動套用。

### Agentic 模式範例

首先，在設定中啟用 Agentic 模式。

**列出所有筆記：**
```
「列出我的所有筆記」
「顯示 Projects 資料夾中的筆記」
```

**讀取筆記：**
```
「讀取 meeting-notes.md」
「Ideas/startup-plan.md 裡面寫了什麼？」
```

**創建筆記：**
```
「創建一個新筆記叫 daily-log.md，標題用今天的日期」
「在 Projects/ 資料夾中建立 roadmap.md」
```

**搜尋筆記：**
```
「找出所有提到『機器學習』的筆記」
「搜尋關於專案截止日期的筆記」
```

**多步驟操作：**
```
「讀取 meeting-notes.md，摘要後存到 summaries/meeting-summary.md」
「列出 Journal/ 中的所有筆記，然後創建一個索引筆記連結到每一篇」
「搜尋所有關於『預算』的筆記，讀取它們，然後創建一個整合的 budget-overview.md」
```

## 使用技巧

- **上下文很重要**：聊天前選取特定文字可以獲得更精準的回應
- **指令要明確**：清楚的指示會產生更好的結果
- **善用歷史**：Claude 會記住對話內容，可以參考之前的訊息
- **Agentic 工作流程**：將複雜任務分解成步驟，Claude 會依序執行

## 疑難排解

### 「找不到 claude 命令」
- 確認已安裝 Claude Code CLI
- 檢查設定中的 CLI 路徑
- 執行 `which claude`（macOS/Linux）或 `where claude`（Windows）找到路徑

### 「Claude Code 尚未登入」
- 在終端機執行 `claude` 完成認證

### API Key 錯誤
- 確認 API Key 是否正確
- 檢查 Anthropic 帳號是否有額度

## 授權

MIT License

## 貢獻

歡迎在 [GitHub](https://github.com/user/clauwrite) 提交 Issue 和 Pull Request。
