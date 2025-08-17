# Obsidian MCP Server - Development Task List

## Project Overview
Build a Model Context Protocol (MCP) server for Obsidian that follows the established patterns from other MCP servers in the repos directory (claude-speak, claude-listen, claude-look, godot-mcp). The server will enable Claude Code to interact directly with Obsidian vaults through direct file system access - no third-party plugins required.

## Architecture Approach
- **TypeScript-based** implementation using `@modelcontextprotocol/sdk`
- **Direct file system access** to Obsidian vaults - full control, no external dependencies
- **Stdio transport** for Claude Code communication
- **Modular tool structure** with separate files for each tool category
- **Production-grade setup** with proper error handling, logging, and validation
- **Windows-optimized** with proper path handling and vault discovery

## Development Tasks

### 1. Project Setup & Configuration
**Files to create:**
- `package.json` - Node.js project configuration
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Git ignore patterns
- `README.md` - Documentation

**Implementation details:**
```json
// package.json structure (similar to claude-speak)
{
  "name": "obsidian-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "winston": "^3.11.0",
    "zod": "^3.22.4",
    "gray-matter": "^4.0.3",
    "markdown-it": "^14.0.0"
  }
}
```

### 2. Core MCP Server Implementation
**File: `src/index.ts`**
- Initialize MCP server with stdio transport
- Register tool handlers
- Set up error handling and logging

**Key components:**
```typescript
// Server initialization pattern from existing servers
const server = new Server(
  { name: "obsidian-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);
```

### 3. Vault Management Module
**File: `src/lib/vaultManager.ts`**
- Vault discovery and validation
- Path resolution and normalization
- File system operations wrapper
- Obsidian-specific file handling (.md, attachments)

**Implementation needs:**
- Auto-discover vaults from common Windows locations:
  ```typescript
  // Default Obsidian vault locations on Windows
  const vaultPaths = [
    `${process.env.USERPROFILE}\\Documents\\Obsidian`,
    `${process.env.USERPROFILE}\\OneDrive\\Documents\\Obsidian`,
    `${process.env.APPDATA}\\obsidian\\vaults.json` // Obsidian's vault registry
  ];
  ```
- Validate vault structure (presence of .obsidian folder)
- Safe path operations to prevent access outside vault
- Handle Windows path separators correctly
- Read Obsidian's config to understand vault settings

### 4. Tool Implementations

#### 4.1 Core Vault Operations
**File: `src/tools/vault-operations.ts`**

**Tools to implement:**
- `get_server_info` - Get MCP server status and capabilities
  - Input: none
  - Output: version, available vaults, current config
- `fetch` - General purpose file fetcher
  - Input: vault_path, file_path, options
  - Output: file content with metadata

#### 4.2 Active File Management
**File: `src/tools/active-file.ts`**

**Tools to implement:**
- `get_active_file` - Get the currently "active" file (last accessed)
  - Input: vault_path
  - Output: file path, content, metadata
- `update_active_file` - Replace entire content of active file
  - Input: vault_path, content
  - Output: success status
- `append_to_active_file` - Append content to active file
  - Input: vault_path, content, position (end/beginning/after_frontmatter)
  - Output: success status
- `patch_active_file` - Partially update active file
  - Input: vault_path, patches[] (line-based or pattern-based)
  - Output: success status, changes applied
- `delete_active_file` - Delete the active file
  - Input: vault_path
  - Output: success status

#### 4.3 Note Operations Tools
**File: `src/tools/notes.ts`**

**Tools to implement:**
- `get_vault_file` - Read any file from vault (alias: read_note)
  - Input: vault_path, file_path
  - Output: content, frontmatter, stats
- `create_vault_file` - Create new file (alias: write_note)
  - Input: vault_path, file_path, content
  - Output: success status, file path
- `append_to_vault_file` - Append to existing file
  - Input: vault_path, file_path, content, position
  - Output: success status
- `patch_vault_file` - Partial file updates with precise targeting
  - Input: vault_path, file_path, patches[]
  - Patch types:
    ```typescript
    type Patch = 
      | { type: 'line', lineNumber: number, content: string }
      | { type: 'heading', heading: string, content: string, mode: 'replace'|'append'|'prepend' }
      | { type: 'block', blockId: string, content: string }
      | { type: 'pattern', pattern: string, replacement: string, all?: boolean }
    ```
- `delete_vault_file` - Delete a file (alias: delete_note)
  - Input: vault_path, file_path
  - Output: success status
- `list_vault_files` - List all files in vault
  - Input: vault_path, options (extensions, folder, recursive)
  - Output: array of file paths with metadata
- `show_file_in_obsidian` - Open file in Obsidian (if running)
  - Input: vault_path, file_path
  - Output: success status (uses obsidian:// URI scheme)

#### 4.4 Search Tools
**File: `src/tools/search.ts`**

**Tools to implement:**
- `search_vault` - Full-text search with advanced options
  - Input: vault_path, query, options (regex, case_sensitive, file_types, folders)
  - Output: matching files with context, line numbers, match count
- `search_vault_simple` - Simplified search for quick queries
  - Input: vault_path, query
  - Output: list of matching file paths
- `search_vault_smart` - AI-enhanced semantic search
  - Input: vault_path, query, options (semantic_matching, fuzzy, synonyms)
  - Output: ranked results with relevance scores
  - Features:
    - Fuzzy matching for typos
    - Synonym expansion
    - Semantic similarity (if configured)
    - Smart ranking based on:
      - Title matches (higher weight)
      - Tag matches
      - Recent modification
      - Link connectivity
- `find_by_tag` - Find notes with specific tags
  - Input: vault_path, tags[]
  - Output: note paths with tag matches
- `find_backlinks` - Find notes linking to a specific note
  - Input: vault_path, note_path
  - Output: array of linking notes

#### 4.5 Template Operations
**File: `src/tools/templates.ts`**

**Tools to implement:**
- `execute_template` - Process and execute Obsidian templates
  - Input: vault_path, template_path, variables, target_path
  - Output: processed content, file created/updated
  - Features:
    - Variable substitution: `{{title}}`, `{{date}}`, `{{time}}`
    - Date formatting: `{{date:YYYY-MM-DD}}`
    - Dynamic fields from variables object
    - Templater plugin syntax support (optional)
    - Example:
      ```markdown
      # {{title}}
      Created: {{date:YYYY-MM-DD HH:mm}}
      Tags: {{tags}}
      
      ## Notes
      {{content}}
      ```
- `list_templates` - List available templates
  - Input: vault_path, template_folder (default: "Templates")
  - Output: array of template files with descriptions
- `create_from_template` - Create new note from template
  - Input: vault_path, template_name, title, folder
  - Output: new file path, processed content

#### 4.6 Graph Navigation Tools
**File: `src/tools/graph.ts`**

**Tools to implement:**
- `trace_links` - Follow the graph view down N levels from a starting note
  - Input: vault_path, note_path, depth (how many levels to follow), direction (forward/backward/both)
  - Output: complete graph structure with all discovered nodes and connections
  - Example: "Follow all connections from 'Project Overview' down 3 levels"
    ```json
    // trace_links("vault", "Project Overview", 3, "forward")
    {
      "nodes": [
        {"id": "Project Overview", "level": 0, "type": "start"},
        {"id": "Task List", "level": 1, "linkedFrom": ["Project Overview"]},
        {"id": "Team Notes", "level": 1, "linkedFrom": ["Project Overview"]},
        {"id": "Sprint 1", "level": 2, "linkedFrom": ["Task List"]},
        {"id": "John's Tasks", "level": 2, "linkedFrom": ["Task List", "Team Notes"]},
        {"id": "Bug #123", "level": 3, "linkedFrom": ["Sprint 1"]},
        {"id": "Feature X", "level": 3, "linkedFrom": ["John's Tasks"]}
      ],
      "edges": [
        {"from": "Project Overview", "to": "Task List", "type": "link"},
        {"from": "Project Overview", "to": "Team Notes", "type": "embed"},
        {"from": "Task List", "to": "Sprint 1", "type": "link"},
        {"from": "Task List", "to": "John's Tasks", "type": "link"},
        {"from": "Team Notes", "to": "John's Tasks", "type": "link"},
        {"from": "Sprint 1", "to": "Bug #123", "type": "link"},
        {"from": "John's Tasks", "to": "Feature X", "type": "link"}
      ],
      "stats": {
        "totalNodes": 7,
        "maxDepthReached": 3,
        "totalEdges": 7,
        "nodesPerLevel": [1, 2, 2, 2]
      }
    }
    ```
- `get_note_connections` - Get all connections for a specific note
  - Input: vault_path, note_path
  - Output: incoming links, outgoing links, tags, aliases
- `find_orphaned_notes` - Find notes with no incoming or outgoing links
  - Input: vault_path
  - Output: list of isolated notes
- `find_shortest_path` - Find shortest path between two notes
  - Input: vault_path, from_note, to_note
  - Output: array of notes forming the path

#### 4.7 Metadata Tools
**File: `src/tools/metadata.ts`**

**Tools to implement:**
- `get_frontmatter` - Extract frontmatter from note
  - Input: vault_path, note_path
  - Output: parsed frontmatter object
- `update_frontmatter` - Update note frontmatter
  - Input: vault_path, note_path, frontmatter
  - Output: success status
- `list_tags` - List all tags in vault
  - Input: vault_path
  - Output: tag list with counts

#### 4.8 Vault Information Tools
**File: `src/tools/vault.ts`**

**Tools to implement:**
- `get_vault_info` - Get vault statistics and configuration
  - Input: vault_path
  - Output: stats (note count, size, etc.)
- `list_vaults` - List available Obsidian vaults
  - Input: none
  - Output: array of vault paths
- `get_recent_notes` - Get recently modified notes
  - Input: vault_path, limit
  - Output: sorted list of recent notes

### 5. Utility Modules

#### 5.1 Frontmatter Parser
**File: `src/lib/frontmatter.ts`**
- Parse YAML frontmatter using gray-matter
- Merge and update frontmatter
- Validate frontmatter structure
- Preserve formatting and comments

#### 5.2 Markdown Processor
**File: `src/lib/markdown.ts`**
- Extract links and backlinks
- Parse tags (#tag and frontmatter tags)
- Handle Obsidian-specific syntax:
  ```typescript
  // Wiki links: [[Note Name]] or [[Note Name|Display Text]]
  // Embeds: ![[Image.png]] or ![[Other Note]]
  // Block references: [[Note Name#^block-id]]
  // Heading links: [[Note Name#Heading]]
  ```

#### 5.3 File Watcher (Optional)
**File: `src/lib/watcher.ts`**
- Monitor vault for changes
- Cache invalidation on file updates
- Efficient indexing for large vaults

#### 5.4 Logger
**File: `src/lib/logger.ts`**
- Winston-based logging (following claude-speak pattern)
- Structured logging for debugging
- Error tracking and reporting

### 6. Input Validation
**File: `src/lib/validation.ts`**
- Zod schemas for all tool inputs
- Path validation and sanitization
- Prevent directory traversal attacks

### 7. Testing Suite
**Files in `src/__tests__/`**
- Unit tests for each tool
- Integration tests for vault operations
- Mock file system for testing

**Test structure:**
```typescript
// Following jest pattern from claude-speak
describe('Note Operations', () => {
  test('should read note with frontmatter', async () => {
    // Test implementation
  });
});
```

### 8. Build & Development Scripts
**Scripts to add in package.json:**
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

## Implementation Order

1. **Phase 1: Foundation** (Core setup)
   - Project initialization
   - Basic MCP server setup
   - Vault manager implementation
   - Logger setup

2. **Phase 2: Basic Operations** (MVP)
   - read_note tool
   - write_note tool
   - list_notes tool
   - Basic error handling

3. **Phase 3: Search & Discovery**
   - search_notes tool
   - find_by_tag tool
   - Markdown parser for links/tags

4. **Phase 4: Advanced Features**
   - Frontmatter operations
   - Backlink discovery
   - Vault statistics

5. **Phase 5: Polish & Testing**
   - Comprehensive error handling
   - Unit and integration tests
   - Documentation
   - Performance optimization

## Configuration Integration

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "obsidian-mcp": {
      "command": "node",
      "args": ["C:\\repos\\obsidian-mcp\\dist\\index.js"],
      "env": {
        "DEFAULT_VAULT": "C:\\Users\\[username]\\Documents\\Obsidian\\[vault-name]"
      }
    }
  }
}
```

## Key Design Decisions

1. **Direct File Access**: We access vault files directly through the file system, giving us:
   - No dependencies on third-party plugins
   - Works whether Obsidian is running or not
   - Full control over operations
   - Better performance (no HTTP overhead)
   - Simpler deployment and maintenance

2. **TypeScript First**: Following the pattern of other MCP servers in the repo, using TypeScript for type safety and better development experience.

3. **Modular Architecture**: Each tool category in its own file for maintainability, similar to claude-speak's structure.

4. **Smart Vault Discovery**: The server can:
   - Auto-discover vaults from Obsidian's registry
   - Accept explicit vault paths via environment variables
   - Remember recently used vaults
   - Default to the most recently modified vault

5. **Safe by Default**: All operations validate paths, prevent directory traversal, and handle errors gracefully.

## Security Considerations

- Path validation to prevent access outside vault
- Input sanitization using Zod schemas
- Read-only operations by default
- Explicit confirmation for destructive operations
- No execution of embedded scripts or code

## Performance Optimizations

- Cache vault structure for list operations
- Lazy loading of note content
- Streaming for large vaults
- Debounced file watching for real-time updates
- Efficient search using indexed metadata

## Advantages of Direct File Access

1. **No Dependencies**: Works out of the box, no plugins to install or maintain
2. **Always Available**: Works whether Obsidian is open or closed
3. **Full Control**: Direct access to all vault files and metadata
4. **Performance**: No HTTP overhead, direct file I/O is fastest
5. **Reliability**: No middleware that can fail or need updates
6. **Scriptability**: Can be used in automated workflows without Obsidian running
7. **Version Control Friendly**: Can read/write files in git-managed vaults safely

## Implementation Notes

### Reading Obsidian's Vault Registry
```typescript
// Obsidian stores vault info in %APPDATA%/obsidian/obsidian.json
interface ObsidianConfig {
  vaults: {
    [vaultId: string]: {
      path: string;
      ts: number; // last opened timestamp
      open?: boolean;
    }
  }
}
```

### Handling Obsidian File References
```typescript
// Convert wiki link to file path
function wikiLinkToPath(link: string, currentFile: string): string {
  // [[Note]] -> Note.md
  // [[Folder/Note]] -> Folder/Note.md
  // [[../Note]] -> resolve relative to current file
}
```

### Active File Tracking
```typescript
// Track the "active" file across sessions
class ActiveFileTracker {
  private activeFilePath: string | null = null;
  private lastAccessTime: Map<string, Date> = new Map();
  
  setActive(filePath: string) {
    this.activeFilePath = filePath;
    this.lastAccessTime.set(filePath, new Date());
    // Persist to .obsidian-mcp/state.json
  }
  
  getActive(): string | null {
    // Return current active or most recently accessed
    return this.activeFilePath || this.getMostRecent();
  }
}
```

### Graph Traversal Implementation
```typescript
// Breadth-first traversal with configurable depth
async function traceLinks(
  startNote: string, 
  depth: number = 2,  // How many levels deep to follow
  direction: 'forward' | 'backward' | 'both' = 'both'
): Promise<GraphStructure> {
  const visited = new Set<string>();
  const queue: Array<{note: string, level: number}> = [{note: startNote, level: 0}];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  while (queue.length > 0) {
    const {note, level} = queue.shift()!;
    
    // Stop at specified depth
    if (level > depth || visited.has(note)) continue;
    
    visited.add(note);
    nodes.push({id: note, level});
    
    // Follow based on direction
    if (direction === 'forward' || direction === 'both') {
      // Get all outgoing links from this note
      const outLinks = await extractOutgoingLinks(note);
      for (const link of outLinks) {
        edges.push({from: note, to: link.target, type: link.type});
        if (level < depth) {
          queue.push({note: link.target, level: level + 1});
        }
      }
    }
    
    if (direction === 'backward' || direction === 'both') {
      // Get all incoming links to this note (backlinks)
      const inLinks = await findBacklinks(note);
      for (const link of inLinks) {
        edges.push({from: link.source, to: note, type: 'backlink'});
        if (level < depth) {
          queue.push({note: link.source, level: level + 1});
        }
      }
    }
  }
  
  return {nodes, edges};
}

// Example usage:
// trace_links("My Project", 1) -> Direct connections only
// trace_links("My Project", 2) -> Connections and their connections  
// trace_links("My Project", 5) -> Follow 5 levels deep
// trace_links("My Project", 10, 'forward') -> Deep forward traversal
// trace_links("My Project", 3, 'backward') -> Find what references this note up to 3 levels
```

## Future Enhancements (Post-MVP)

- Canvas file support (.canvas JSON files)
- Plugin configuration reading from .obsidian/plugins/
- Template operations with variable substitution
- Daily notes integration (auto-create, naming patterns)
- Graph view data export (node relationships)
- Attachment management (images, PDFs, etc.)
- Vault backup operations
- Smart conflict resolution for concurrent edits
- Obsidian URI scheme support (obsidian://open?vault=...)