import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import {
  DownloadRequest,
  JobResult,
  ContentItem,
  ContentType,
  Platform,
} from './types';
import { getDownloadPath } from './storage';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { homedir } from 'os';

const execFileAsync = promisify(execFile);

// Kill process after this many ms
const PROCESS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Cookie file path (users can place cookies.txt here)
const COOKIE_FILE = join(homedir(), 'Downloads', 'socialvault', '.cookies.txt');

interface DownloadCallbacks {
  onProgress?: (completed: number, total: number, currentItem: string) => void;
  onStatusChange?: (status: string) => void;
}

/**
 * Normalize a target to a proper URL.
 * Accepts: full URL, username, @username
 */
function normalizeTarget(target: string, platform: Platform): string {
  const trimmed = target.trim();

  // Already a URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Strip leading @
  const username = trimmed.replace(/^@/, '');

  switch (platform) {
    case 'tiktok':
      return `https://www.tiktok.com/@${username}`;
    case 'instagram':
      return `https://www.instagram.com/${username}/`;
    default:
      return trimmed;
  }
}

export async function downloadContent(
  request: DownloadRequest,
  callbacks?: DownloadCallbacks
): Promise<JobResult> {
  const platform = request.platform || 'tiktok';
  const normalizedTarget = normalizeTarget(request.target, platform);
  const username = extractUsername(normalizedTarget, platform);
  const downloadDir = getDownloadPath(platform, username);

  if (!existsSync(downloadDir)) {
    mkdirSync(downloadDir, { recursive: true });
  }

  console.log(`[SocialVault] Download: platform=${platform} target=${normalizedTarget} dir=${downloadDir}`);
  callbacks?.onStatusChange?.('Starting download...');

  const requestWithUrl = { ...request, target: normalizedTarget };

  switch (platform) {
    case 'tiktok':
      await downloadTikTok(requestWithUrl, downloadDir, callbacks);
      break;
    case 'instagram':
      await downloadInstagram(requestWithUrl, downloadDir, callbacks);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  callbacks?.onStatusChange?.('Scanning downloaded files...');
  const items = scanDownloadedFiles(downloadDir);
  const totalSize = items.reduce((sum, item) => sum + item.size_bytes, 0);

  // Write metadata sidecar
  const metadata = {
    platform,
    username,
    downloaded_at: new Date().toISOString(),
    source_url: normalizedTarget,
    mode: request.mode,
    item_count: items.length,
    total_size_bytes: totalSize,
    items: items.map((i) => ({
      filename: i.filename,
      type: i.type,
      caption: i.caption,
      hashtags: i.hashtags,
      duration_seconds: i.duration_seconds,
      created_at: i.created_at,
      metrics: i.metrics,
    })),
  };

  writeFileSync(join(downloadDir, '_metadata.json'), JSON.stringify(metadata, null, 2));

  return {
    platform,
    username,
    items,
    total_size_bytes: totalSize,
    download_path: downloadDir,
  };
}

async function downloadTikTok(
  request: DownloadRequest,
  downloadDir: string,
  callbacks?: DownloadCallbacks
): Promise<void> {
  const args = [
    '--no-warnings',
    '--no-check-certificates',
    '-o', join(downloadDir, '%(id)s.%(ext)s'),
    '--write-info-json',
    '--no-overwrites',
  ];

  // Add cookie file if it exists
  if (existsSync(COOKIE_FILE)) {
    args.push('--cookies', COOKIE_FILE);
  }

  if (request.mode === 'profile') {
    if (request.limit) {
      args.push('--playlist-end', String(request.limit));
    }
  }

  args.push(request.target);
  console.log(`[SocialVault] yt-dlp args:`, args.join(' '));
  await runYtDlp(args, callbacks);
}

async function downloadInstagram(
  request: DownloadRequest,
  downloadDir: string,
  callbacks?: DownloadCallbacks
): Promise<void> {
  // gallery-dl for ALL Instagram downloads (yt-dlp Instagram extractor is unreliable)
  const args = [
    '--dest', downloadDir,
    '-o', 'directory=[]',
    '--no-mtime',
    '--write-metadata',
  ];

  // Add cookie file if it exists (Instagram requires auth for most content)
  if (existsSync(COOKIE_FILE)) {
    args.push('--cookies', COOKIE_FILE);
  }

  if (request.mode === 'profile' && request.limit) {
    args.push('--range', `1-${request.limit}`);
  }

  args.push(request.target);
  console.log(`[SocialVault] gallery-dl args:`, args.join(' '));

  try {
    await runProcess('gallery-dl', args, callbacks);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Provide actionable error messages for common Instagram failures
    if (message.includes('Unable to extract') || message.includes('404') || message.includes('login')) {
      const hasCookies = existsSync(COOKIE_FILE);
      const hint = hasCookies
        ? 'Instagram cookies may be expired. Re-export cookies from your browser.'
        : `Instagram requires authentication. Export cookies from your browser to: ${COOKIE_FILE}`;
      throw new Error(`Instagram download failed. ${hint}`);
    }
    if (message.includes('429') || message.includes('rate')) {
      throw new Error('Instagram rate limit hit. Wait a few minutes and try again.');
    }
    throw err;
  }
}

/**
 * Run a child process with timeout and proper cleanup.
 */
function runProcess(
  cmd: string,
  args: string[],
  callbacks?: DownloadCallbacks
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let killed = false;
    let stderrOutput = '';
    let itemCount = 0;

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (!proc.killed) proc.kill('SIGKILL');
      }, 5000);
      reject(new Error(`${cmd} timed out after ${PROCESS_TIMEOUT_MS / 1000}s`));
    }, PROCESS_TIMEOUT_MS);

    proc.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        itemCount++;
        const filename = basename(line.trim());
        callbacks?.onProgress?.(itemCount, 0, filename);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      stderrOutput += msg + '\n';
      if (msg) console.error(`[${cmd}]`, msg);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (killed) return;
      if (code === 0) {
        resolve();
      } else {
        const errMsg = stderrOutput.trim().split('\n').pop() || `exited with code ${code}`;
        reject(new Error(`${cmd} failed: ${errMsg}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`${cmd} not found: ${err.message}`));
    });
  });
}

function runYtDlp(args: string[], callbacks?: DownloadCallbacks): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let killed = false;
    let stderrOutput = '';
    let itemCount = 0;

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (!proc.killed) proc.kill('SIGKILL');
      }, 5000);
      reject(new Error(`yt-dlp timed out after ${PROCESS_TIMEOUT_MS / 1000}s`));
    }, PROCESS_TIMEOUT_MS);

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      console.log('[yt-dlp stdout]', text.trim());

      const progressMatch = text.match(/\[download\]\s+(\d+\.?\d*)%/);
      if (progressMatch) {
        callbacks?.onProgress?.(itemCount, 0, `Downloading... ${progressMatch[1]}%`);
      }
      if (text.includes('[download] Downloading item')) {
        const match = text.match(/item (\d+) of (\d+)/);
        if (match) {
          itemCount = parseInt(match[1]);
          const total = parseInt(match[2]);
          callbacks?.onProgress?.(itemCount, total, `Item ${itemCount} of ${total}`);
        }
      }
      if (text.includes('[download] Destination:') || text.includes('has already been downloaded')) {
        itemCount++;
        const filenameMatch = text.match(/Destination:\s+(.+)/);
        const filename = filenameMatch ? basename(filenameMatch[1].trim()) : `Item ${itemCount}`;
        callbacks?.onProgress?.(itemCount, 0, filename);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      stderrOutput += msg + '\n';
      if (msg) console.error('[yt-dlp stderr]', msg);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (killed) return;
      if (code === 0) {
        resolve();
      } else {
        const errMsg = stderrOutput.trim().split('\n').pop() || `exited with code ${code}`;
        reject(new Error(`yt-dlp failed: ${errMsg}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`yt-dlp not found: ${err.message}`));
    });
  });
}

const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mov', '.mkv',
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
]);

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv']);

/**
 * Recursively scan directory for media files.
 * Handles both flat output (yt-dlp) and nested output (gallery-dl).
 */
function scanDownloadedFiles(dir: string): ContentItem[] {
  const items: ContentItem[] = [];
  scanDir(dir, dir, items);
  return items;
}

function scanDir(rootDir: string, currentDir: string, items: ContentItem[]): void {
  let entries: string[];
  try {
    entries = readdirSync(currentDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.startsWith('_') || entry.startsWith('.')) continue;

    const fullPath = join(currentDir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    // Recurse into subdirectories
    if (stat.isDirectory()) {
      scanDir(rootDir, fullPath, items);
      continue;
    }

    const ext = extname(entry).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(ext)) continue;

    const id = basename(entry, ext);
    const type: ContentType = VIDEO_EXTENSIONS.has(ext) ? 'video' : 'image';

    const item: ContentItem = {
      id,
      type,
      filename: entry,
      size_bytes: stat.size,
    };

    // Try yt-dlp metadata format: {id}.info.json
    const ytdlpInfoPath = join(currentDir, `${id}.info.json`);
    // Try gallery-dl metadata format: {filename}.json
    const galleryDlInfoPath = join(currentDir, `${entry}.json`);

    let info: Record<string, unknown> | null = null;

    if (existsSync(ytdlpInfoPath)) {
      try {
        info = JSON.parse(readFileSync(ytdlpInfoPath, 'utf-8'));
      } catch { /* skip */ }
    } else if (existsSync(galleryDlInfoPath)) {
      try {
        info = JSON.parse(readFileSync(galleryDlInfoPath, 'utf-8'));
      } catch { /* skip */ }
    }

    if (info) {
      // yt-dlp fields
      item.caption = (info.description || info.title || info.caption) as string | undefined;
      item.duration_seconds = info.duration as number | undefined;

      // Date: yt-dlp uses upload_date (YYYYMMDD), gallery-dl uses date as ISO string or timestamp
      if (typeof info.upload_date === 'string' && (info.upload_date as string).length === 8) {
        const d = info.upload_date as string;
        item.created_at = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      } else if (info.date) {
        const d = new Date(info.date as string | number);
        if (!isNaN(d.getTime())) {
          item.created_at = d.toISOString().split('T')[0];
        }
      }

      // Metrics
      item.metrics = {
        views: info.view_count as number | undefined,
        likes: (info.like_count ?? info.likes) as number | undefined,
        comments: (info.comment_count ?? info.comments) as number | undefined,
        shares: (info.repost_count ?? info.shares) as number | undefined,
      };

      // Hashtags from caption
      if (item.caption) {
        item.hashtags = Array.from(item.caption.matchAll(/#(\w+)/g)).map((m) => m[1]);
      }
    }

    items.push(item);
  }
}

export function extractUsername(target: string, platform: Platform): string {
  try {
    const url = new URL(target);
    const pathParts = url.pathname.split('/').filter(Boolean);

    switch (platform) {
      case 'tiktok': {
        const user = pathParts.find((p) => p.startsWith('@'));
        return user ? user.replace('@', '') : pathParts[0] || 'unknown';
      }
      case 'instagram':
        return pathParts[0] || 'unknown';
      default:
        return pathParts[0] || 'unknown';
    }
  } catch {
    return target.replace('@', '');
  }
}

export async function checkDependencies(): Promise<{
  'yt-dlp': string | null;
  'gallery-dl': string | null;
  ffmpeg: string | null;
}> {
  const check = async (cmd: string): Promise<string | null> => {
    try {
      const { stdout } = await execFileAsync(cmd, ['--version']);
      return stdout.trim().split('\n')[0];
    } catch {
      return null;
    }
  };

  return {
    'yt-dlp': await check('yt-dlp'),
    'gallery-dl': await check('gallery-dl'),
    ffmpeg: await check('ffmpeg'),
  };
}
