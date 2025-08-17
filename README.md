# Obsidian MCP Server

Direct file system access to Obsidian vaults through Model Context Protocol (MCP).

## Features

- **Direct vault access** - No plugins or REST API required
- **Auto-discovery** - Finds vaults from Obsidian config and common locations
- **Full-text search** - Search across all notes with regex support
- **Note operations** - Read, write, append, prepend to notes
- **Vault management** - List vaults, get statistics, browse files
- **Windows optimized** - Handles Windows paths correctly

## Installation

1. Make sure the project is built:
```bash
cd C:\repos\obsidian-mcp
npm install
npm run build
```

2. Add to Claude Desktop configuration:

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian-mcp": {
      "command": "node",
      "args": ["C:\\repos\\obsidian-mcp\\dist\\index.js"],
      "env": {
        "OBSIDIAN_VAULT": "C:\\Users\\YourName\\Documents\\YourVault"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Available Tools

### Vault Management
- `list_vaults` - Discover available Obsidian vaults
- `get_vault_info` - Get statistics about a vault

### Note Operations
- `read_note` - Read a note with frontmatter and metadata
- `write_note` - Create or update a note (overwrite/append/prepend)
- `list_notes` - List all notes in vault or folder

### Search
- `search_vault` - Full-text search with regex and case-sensitive options

## Usage Examples

```typescript
// List available vaults
list_vaults()

// Read a note
read_note(vault_path: "C:\\Users\\Name\\Vault", note_path: "Daily Notes/2024-01-17")

// Write a note
write_note(
  vault_path: "C:\\Users\\Name\\Vault",
  note_path: "New Note",
  content: "# My New Note\n\nContent here",
  mode: "overwrite"
)

// Search vault
search_vault(
  vault_path: "C:\\Users\\Name\\Vault",
  query: "project",
  options: { case_sensitive: false }
)
```

## Vault Discovery

The server automatically discovers vaults from:
1. Obsidian's configuration (`%APPDATA%\obsidian\obsidian.json`)
2. Common locations:
   - `%USERPROFILE%\Documents\Obsidian`
   - `%USERPROFILE%\OneDrive\Documents\Obsidian`
3. Environment variable `OBSIDIAN_VAULT`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Type checking
npm run typecheck
```

## Troubleshooting

- **No vaults found**: Make sure you have at least one Obsidian vault with `.obsidian` folder or `.md` files
- **Permission errors**: Run Claude Desktop as the same user who owns the vault files
- **Path not found**: Use full absolute paths for vault_path

## Future Features

- Graph navigation (trace links N levels deep)
- Template execution
- Smart search with fuzzy matching
- Active file tracking
- Partial file updates (patch operations)
- Frontmatter management