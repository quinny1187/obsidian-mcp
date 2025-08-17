import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

export interface VaultInfo {
  path: string;
  name: string;
  noteCount?: number;
  size?: number;
  lastModified?: Date;
}

export class VaultManager {
  private vaultCache: Map<string, VaultInfo> = new Map();
  
  // Common vault locations on Windows
  private getDefaultVaultPaths(): string[] {
    const userProfile = process.env.USERPROFILE || '';
    return [
      path.join(userProfile, 'Documents', 'Obsidian'),
      path.join(userProfile, 'OneDrive', 'Documents', 'Obsidian'),
      path.join(userProfile, 'Documents'),
      path.join(userProfile, 'OneDrive', 'Documents'),
    ];
  }

  // Discover vaults from Obsidian's configuration
  async discoverVaults(): Promise<VaultInfo[]> {
    const vaults: VaultInfo[] = [];
    
    // Try to read Obsidian's vault registry
    const appData = process.env.APPDATA || '';
    const obsidianConfigPath = path.join(appData, 'obsidian', 'obsidian.json');
    
    try {
      const configData = await fs.readFile(obsidianConfigPath, 'utf-8');
      const config = JSON.parse(configData);
      
      if (config.vaults) {
        for (const vaultId in config.vaults) {
          const vault = config.vaults[vaultId];
          if (vault.path && await this.isValidVault(vault.path)) {
            vaults.push({
              path: vault.path,
              name: path.basename(vault.path),
              lastModified: vault.ts ? new Date(vault.ts) : undefined,
            });
          }
        }
      }
    } catch (error) {
      logger.debug('Could not read Obsidian config:', error);
    }
    
    // Also check default locations
    const defaultPaths = this.getDefaultVaultPaths();
    for (const basePath of defaultPaths) {
      try {
        const entries = await fs.readdir(basePath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const vaultPath = path.join(basePath, entry.name);
            if (await this.isValidVault(vaultPath)) {
              // Don't add duplicates
              if (!vaults.find(v => v.path === vaultPath)) {
                vaults.push({
                  path: vaultPath,
                  name: entry.name,
                });
              }
            }
          }
        }
      } catch (error) {
        logger.debug(`Could not scan directory ${basePath}:`, error);
      }
    }
    
    // Check environment variable
    if (process.env.OBSIDIAN_VAULT) {
      const envVault = process.env.OBSIDIAN_VAULT;
      if (await this.isValidVault(envVault)) {
        if (!vaults.find(v => v.path === envVault)) {
          vaults.push({
            path: envVault,
            name: path.basename(envVault),
          });
        }
      }
    }
    
    return vaults;
  }

  // Check if a directory is a valid Obsidian vault
  async isValidVault(vaultPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(vaultPath);
      if (!stats.isDirectory()) return false;
      
      // Check for .obsidian folder or any .md files
      const entries = await fs.readdir(vaultPath);
      const hasObsidianFolder = entries.includes('.obsidian');
      const hasMdFiles = entries.some(e => e.endsWith('.md'));
      
      return hasObsidianFolder || hasMdFiles;
    } catch {
      return false;
    }
  }

  // Validate vault path and ensure it exists
  async validateVault(vaultPath: string): Promise<void> {
    if (!await this.isValidVault(vaultPath)) {
      throw new Error(`Invalid vault path: ${vaultPath}`);
    }
  }

  // Get full file path, handling .md extension
  getFilePath(vaultPath: string, notePath: string): string {
    // Normalize the note path
    let normalizedPath = notePath.replace(/\\/g, '/');
    
    // Add .md extension if not present
    if (!normalizedPath.endsWith('.md')) {
      normalizedPath += '.md';
    }
    
    // Ensure safe path (no directory traversal)
    const safePath = path.normalize(normalizedPath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    return path.join(vaultPath, safePath);
  }

  // List all markdown files in a vault
  async listMarkdownFiles(vaultPath: string, folderPath?: string): Promise<string[]> {
    const basePath = folderPath ? path.join(vaultPath, folderPath) : vaultPath;
    const files: string[] = [];
    
    async function scanDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Return path relative to vault
          const relativePath = path.relative(vaultPath, fullPath);
          files.push(relativePath.replace(/\\/g, '/'));
        }
      }
    }
    
    await scanDir(basePath);
    return files;
  }

  // Get vault statistics
  async getVaultStats(vaultPath: string): Promise<VaultInfo> {
    await this.validateVault(vaultPath);
    
    const files = await this.listMarkdownFiles(vaultPath);
    let totalSize = 0;
    let lastModified = new Date(0);
    
    for (const file of files) {
      try {
        const filePath = path.join(vaultPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        if (stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }
      } catch (error) {
        logger.debug(`Could not stat file ${file}:`, error);
      }
    }
    
    return {
      path: vaultPath,
      name: path.basename(vaultPath),
      noteCount: files.length,
      size: totalSize,
      lastModified,
    };
  }
}