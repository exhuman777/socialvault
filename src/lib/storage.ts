import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { homedir } from 'os';
import { Platform } from './types';

const BASE_DIR = join(homedir(), 'Downloads', 'socialvault');

export function getDownloadPath(platform: Platform, username: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dir = join(BASE_DIR, platform, username, date);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getBaseDir(): string {
  return BASE_DIR;
}

interface StorageStats {
  total_files: number;
  total_size_bytes: number;
  platforms: Record<string, { files: number; size_bytes: number }>;
}

export function getStorageStats(): StorageStats {
  const stats: StorageStats = {
    total_files: 0,
    total_size_bytes: 0,
    platforms: {},
  };

  if (!existsSync(BASE_DIR)) return stats;

  const walkDir = (dir: string, platform?: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const fullPath = join(dir, entry);
      try {
        const s = statSync(fullPath);
        if (s.isDirectory()) {
          const p = platform || entry;
          walkDir(fullPath, p);
        } else if (s.isFile()) {
          const ext = extname(entry).toLowerCase();
          const mediaExts = new Set(['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp', '.gif']);
          if (mediaExts.has(ext)) {
            stats.total_files++;
            stats.total_size_bytes += s.size;
            if (platform) {
              if (!stats.platforms[platform]) {
                stats.platforms[platform] = { files: 0, size_bytes: 0 };
              }
              stats.platforms[platform].files++;
              stats.platforms[platform].size_bytes += s.size;
            }
          }
        }
      } catch {
        continue;
      }
    }
  };

  walkDir(BASE_DIR);
  return stats;
}

export function prepareZoUpload(): string {
  const zoDir = join(BASE_DIR, '_zo-upload');
  if (!existsSync(zoDir)) {
    mkdirSync(zoDir, { recursive: true });
  }

  const mediaExts = new Set(['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp', '.gif']);
  let fileCount = 0;

  const walkAndCopy = (dir: string, relativePath: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.') || entry === '_zo-upload') continue;
      const fullPath = join(dir, entry);
      try {
        const s = statSync(fullPath);
        if (s.isDirectory()) {
          walkAndCopy(fullPath, join(relativePath, entry));
        } else if (s.isFile()) {
          const ext = extname(entry).toLowerCase();
          if (mediaExts.has(ext) || entry === '_metadata.json') {
            const destDir = join(zoDir, relativePath);
            if (!existsSync(destDir)) {
              mkdirSync(destDir, { recursive: true });
            }
            copyFileSync(fullPath, join(destDir, entry));
            fileCount++;
          }
        }
      } catch {
        continue;
      }
    }
  };

  walkAndCopy(BASE_DIR, '');

  // Write manifest
  const manifest = {
    prepared_at: new Date().toISOString(),
    total_files: fileCount,
    source: BASE_DIR,
    instructions: 'Upload this entire folder to zo.computer',
  };
  writeFileSync(join(zoDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return zoDir;
}
