#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { VaultManager } from './lib/vaultManager.js';
import { logger } from './lib/logger.js';
import { handleReadNote, handleWriteNote, handleListNotes } from './tools/notes.js';
import { handleSearchVault } from './tools/search.js';
import { handleGetVaultInfo, handleListVaults } from './tools/vault.js';

// Initialize vault manager
const vaultManager = new VaultManager();

// Create server instance
const server = new Server(
  {
    name: 'obsidian-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const TOOLS: Tool[] = [
  {
    name: 'list_vaults',
    description: 'List available Obsidian vaults',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_vault_info',
    description: 'Get information about a specific vault',
    inputSchema: {
      type: 'object',
      properties: {
        vault_path: {
          type: 'string',
          description: 'Path to the Obsidian vault',
        },
      },
      required: ['vault_path'],
    },
  },
  {
    name: 'read_note',
    description: 'Read a note from the vault',
    inputSchema: {
      type: 'object',
      properties: {
        vault_path: {
          type: 'string',
          description: 'Path to the Obsidian vault',
        },
        note_path: {
          type: 'string',
          description: 'Path to the note relative to vault root (with or without .md extension)',
        },
      },
      required: ['vault_path', 'note_path'],
    },
  },
  {
    name: 'write_note',
    description: 'Create or update a note in the vault',
    inputSchema: {
      type: 'object',
      properties: {
        vault_path: {
          type: 'string',
          description: 'Path to the Obsidian vault',
        },
        note_path: {
          type: 'string',
          description: 'Path to the note relative to vault root',
        },
        content: {
          type: 'string',
          description: 'Content of the note',
        },
        mode: {
          type: 'string',
          enum: ['overwrite', 'append', 'prepend'],
          description: 'How to handle existing content',
          default: 'overwrite',
        },
      },
      required: ['vault_path', 'note_path', 'content'],
    },
  },
  {
    name: 'list_notes',
    description: 'List all notes in a vault or folder',
    inputSchema: {
      type: 'object',
      properties: {
        vault_path: {
          type: 'string',
          description: 'Path to the Obsidian vault',
        },
        folder_path: {
          type: 'string',
          description: 'Optional folder path within vault',
        },
      },
      required: ['vault_path'],
    },
  },
  {
    name: 'search_vault',
    description: 'Search for text across all notes in vault',
    inputSchema: {
      type: 'object',
      properties: {
        vault_path: {
          type: 'string',
          description: 'Path to the Obsidian vault',
        },
        query: {
          type: 'string',
          description: 'Search query',
        },
        options: {
          type: 'object',
          properties: {
            case_sensitive: {
              type: 'boolean',
              default: false,
            },
            regex: {
              type: 'boolean',
              default: false,
            },
          },
        },
      },
      required: ['vault_path', 'query'],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing available tools');
  return {
    tools: TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Tool called: ${name}`, { args });

  try {
    let result: any;

    switch (name) {
      case 'list_vaults':
        result = await handleListVaults(vaultManager);
        break;

      case 'get_vault_info':
        if (!args || typeof args !== 'object' || !('vault_path' in args)) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing vault_path');
        }
        result = await handleGetVaultInfo(vaultManager, args.vault_path as string);
        break;

      case 'read_note':
        if (!args || typeof args !== 'object' || !('vault_path' in args) || !('note_path' in args)) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
        }
        result = await handleReadNote(vaultManager, args.vault_path as string, args.note_path as string);
        break;

      case 'write_note':
        if (!args || typeof args !== 'object' || !('vault_path' in args) || !('note_path' in args) || !('content' in args)) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
        }
        result = await handleWriteNote(
          vaultManager,
          args.vault_path as string,
          args.note_path as string,
          args.content as string,
          (args.mode as 'overwrite' | 'append' | 'prepend') || 'overwrite'
        );
        break;

      case 'list_notes':
        if (!args || typeof args !== 'object' || !('vault_path' in args)) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing vault_path');
        }
        result = await handleListNotes(vaultManager, args.vault_path as string, args.folder_path as string | undefined);
        break;

      case 'search_vault':
        if (!args || typeof args !== 'object' || !('vault_path' in args) || !('query' in args)) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
        }
        result = await handleSearchVault(
          vaultManager,
          args.vault_path as string,
          args.query as string,
          args.options as any
        );
        break;

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        } as TextContent,
      ],
    };
  } catch (error) {
    logger.error(`Error executing tool ${name}:`, error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  
  logger.info('Starting Obsidian MCP server...');
  
  await server.connect(transport);
  logger.info('Obsidian MCP server started successfully');
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});