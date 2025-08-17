import fs from 'fs/promises';
import path from 'path';
import { VaultManager } from '../lib/vaultManager.js';
import { logger } from '../lib/logger.js';

interface SearchResult {
  path: string;
  matches: Array<{
    line: number;
    content: string;
    context: string;
  }>;
  matchCount: number;
}

export async function handleSearchVault(
  vaultManager: VaultManager,
  vaultPath: string,
  query: string,
  options?: {
    case_sensitive?: boolean;
    regex?: boolean;
  }
) {
  await vaultManager.validateVault(vaultPath);
  
  const files = await vaultManager.listMarkdownFiles(vaultPath);
  const results: SearchResult[] = [];
  
  // Prepare search pattern
  let searchPattern: RegExp;
  if (options?.regex) {
    searchPattern = new RegExp(query, options.case_sensitive ? 'g' : 'gi');
  } else {
    // Escape special regex characters if not in regex mode
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchPattern = new RegExp(escaped, options?.case_sensitive ? 'g' : 'gi');
  }
  
  for (const file of files) {
    try {
      const filePath = path.join(vaultPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const matches: SearchResult['matches'] = [];
      
      lines.forEach((line, index) => {
        if (searchPattern.test(line)) {
          // Get context (previous and next line)
          const prevLine = index > 0 ? lines[index - 1] : '';
          const nextLine = index < lines.length - 1 ? lines[index + 1] : '';
          
          matches.push({
            line: index + 1,
            content: line.trim(),
            context: [prevLine.trim(), line.trim(), nextLine.trim()]
              .filter(l => l)
              .join(' ... '),
          });
        }
        // Reset lastIndex for global regex
        searchPattern.lastIndex = 0;
      });
      
      if (matches.length > 0) {
        results.push({
          path: file,
          matches,
          matchCount: matches.length,
        });
      }
    } catch (error) {
      logger.warn(`Could not search file ${file}:`, error);
    }
  }
  
  return {
    query,
    options,
    resultCount: results.length,
    totalMatches: results.reduce((sum, r) => sum + r.matchCount, 0),
    results,
  };
}