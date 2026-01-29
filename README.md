# Clauwrite

An Obsidian plugin that integrates Claude AI to help you write, edit, and manage your notes.

[繁體中文說明](./README.zh-TW.md)

## Features

### Chat Interface
- **Conversational AI**: Chat with Claude directly within Obsidian
- **Context-Aware**: Automatically includes the current note or selected text as context
- **Conversation History**: Maintains conversation history across sessions
- **Streaming Responses**: See Claude's responses in real-time

### Quick Commands
- **Summarize**: Generate a concise summary of your note or selected text
- **Rewrite**: Improve clarity and readability while preserving meaning
- **Ask**: Ask questions about your current content

### File Editing
- **Direct Editing**: Claude can directly modify your current file when requested
- Uses `<<<APPLY_EDIT>>>` blocks for safe, explicit file modifications

### Agentic Mode (NEW)
Enable Claude to autonomously work with your entire vault:

| Tool | Description |
|------|-------------|
| `read_note` | Read content from any note |
| `write_note` | Create or update notes |
| `list_notes` | List notes in a folder or entire vault |
| `search_notes` | Search notes by content |
| `create_folder` | Create new folders |

## Installation

### From Obsidian Community Plugins
1. Open Settings → Community Plugins
2. Search for "Clauwrite"
3. Install and enable

### Manual Installation
1. Download the latest release
2. Extract to `.obsidian/plugins/clauwrite/`
3. Enable the plugin in Settings → Community Plugins

## Configuration

### Authentication
Choose one of two authentication methods:

**API Key (All Platforms)**
- Get your API key from [Anthropic Console](https://console.anthropic.com/)
- Enter it in Settings → Clauwrite → API Key

**Claude Code CLI (Desktop Only)**
- Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- Run `claude` once to authenticate
- The plugin will automatically detect and use the CLI

### Settings

| Setting | Description |
|---------|-------------|
| Model | Choose Claude model (Sonnet 4, Opus 4, etc.) |
| Max Tokens | Maximum response length |
| UI Language | Interface language (English/繁體中文) |
| Response Language | Claude's response language |
| Agentic Mode | Enable vault-wide note operations |
| History Length | Number of messages to retain |

### Prompt Templates
Customize system prompts for:
- System Prompt (Claude's behavior)
- Summarize Prompt
- Rewrite Prompt
- Ask Prompt

## Usage

### Basic Chat
1. Open the chat panel (click the message icon in the sidebar)
2. Type your message and press Enter
3. Claude responds with context from your current note

### Using Commands
Access via Command Palette (`Cmd/Ctrl + P`):
- `Clauwrite: Open Chat`
- `Clauwrite: Summarize Content`
- `Clauwrite: Rewrite Selection`
- `Clauwrite: Ask About Content`

### File Editing
Ask Claude to modify your current file:
```
"Add a table of contents to this note"
"Fix the formatting in this document"
"Translate this note to Spanish"
```
Claude will show the changes and apply them automatically.

### Agentic Mode Examples

First, enable Agentic Mode in Settings.

**List all notes:**
```
"List all my notes"
"Show me notes in the Projects folder"
```

**Read notes:**
```
"Read my meeting-notes.md file"
"What's in the Ideas/startup-plan.md?"
```

**Create notes:**
```
"Create a new note called daily-log.md with today's date as the title"
"Make a new note in Projects/ called roadmap.md"
```

**Search notes:**
```
"Find all notes mentioning 'machine learning'"
"Search for notes about project deadlines"
```

**Multi-step operations:**
```
"Read my meeting-notes.md, summarize it, and save the summary to summaries/meeting-summary.md"
"List all notes in Journal/, then create an index note linking to each one"
"Search for all notes about 'budget', read them, and create a consolidated budget-overview.md"
```

## Tips

- **Context matters**: Select specific text before chatting for more focused responses
- **Be specific**: Clear instructions yield better results
- **Use history**: Claude remembers your conversation, so you can reference previous messages
- **Agentic workflows**: Break complex tasks into steps, Claude will execute them sequentially

## Troubleshooting

### "Cannot find claude command"
- Ensure Claude Code CLI is installed
- Check the CLI path in settings
- Run `which claude` (macOS/Linux) or `where claude` (Windows) to find the path

### "Claude Code not logged in"
- Run `claude` in terminal to complete authentication

### API Key errors
- Verify your API key is correct
- Check your Anthropic account has available credits

## License

MIT License

## Contributing

Issues and pull requests welcome on [GitHub](https://github.com/user/clauwrite).
