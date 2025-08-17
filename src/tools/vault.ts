import { VaultManager } from '../lib/vaultManager.js';

export async function handleListVaults(vaultManager: VaultManager) {
  const vaults = await vaultManager.discoverVaults();
  
  return {
    vaults: vaults.map(v => ({
      path: v.path,
      name: v.name,
      lastModified: v.lastModified,
    })),
    count: vaults.length,
  };
}

export async function handleGetVaultInfo(
  vaultManager: VaultManager,
  vaultPath: string
) {
  const stats = await vaultManager.getVaultStats(vaultPath);
  
  return {
    path: stats.path,
    name: stats.name,
    noteCount: stats.noteCount,
    totalSize: stats.size,
    lastModified: stats.lastModified,
    sizeFormatted: formatBytes(stats.size || 0),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}