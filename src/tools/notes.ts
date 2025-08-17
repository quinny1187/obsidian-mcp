import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { VaultManager } from '../lib/vaultManager.js';
import { logger } from '../lib/logger.js';

export async function handleReadNote(
  vaultManager: VaultManager,
  vaultPath: string,
  notePath: string
) {
  await vaultManager.validateVault(vaultPath);
  
  const filePath = vaultManager.getFilePath(vaultPath, notePath);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);
    const stats = await fs.stat(filePath);
    
    return {
      path: notePath,
      content: parsed.content,
      frontmatter: parsed.data,
      raw: content,
      stats: {
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size,
      },
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Note not found: ${notePath}`);
    }
    throw error;
  }
}

export async function handleWriteNote(
  vaultManager: VaultManager,
  vaultPath: string,
  notePath: string,
  content: string,
  mode: 'overwrite' | 'append' | 'prepend' = 'overwrite'
) {
  await vaultManager.validateVault(vaultPath);
  
  const filePath = vaultManager.getFilePath(vaultPath, notePath);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  let finalContent = content;
  
  if (mode !== 'overwrite') {
    try {
      const existing = await fs.readFile(filePath, 'utf-8');
      
      if (mode === 'append') {
        finalContent = existing + '\n' + content;
      } else if (mode === 'prepend') {
        // If the existing content has frontmatter, insert after it
        const parsed = matter(existing);
        if (Object.keys(parsed.data).length > 0) {
          finalContent = parsed.matter + '\n' + content + '\n' + parsed.content;
        } else {
          finalContent = content + '\n' + existing;
        }
      }
    } catch (error: any) {
      // File doesn't exist, just write the content
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  await fs.writeFile(filePath, finalContent, 'utf-8');
  
  return {
    path: notePath,
    success: true,
    mode,
  };
}

export async function handleListNotes(
  vaultManager: VaultManager,
  vaultPath: string,
  folderPath?: string
) {
  await vaultManager.validateVault(vaultPath);
  
  const files = await vaultManager.listMarkdownFiles(vaultPath, folderPath);
  
  const notes = await Promise.all(
    files.map(async (file) => {
      try {
        const filePath = path.join(vaultPath, file);
        const stats = await fs.stat(filePath);
        
        // Try to extract title from frontmatter or first heading
        let title = path.basename(file, '.md');
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = matter(content);
          
          if (parsed.data.title) {
            title = parsed.data.title;
          } else {
            // Look for first # heading
            const match = parsed.content.match(/^#\s+(.+)$/m);
            if (match) {
              title = match[1];
            }
          }
        } catch {
          // Ignore errors reading file content
        }
        
        return {
          path: file,
          title,
          modified: stats.mtime,
          size: stats.size,
        };
      } catch (error) {
        logger.warn(`Could not process file ${file}:`, error);
        return null;
      }
    })
  );
  
  return {
    vault: vaultPath,
    folder: folderPath,
    notes: notes.filter(n => n !== null),
  };
}