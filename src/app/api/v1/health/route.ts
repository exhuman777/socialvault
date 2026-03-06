import { createResponse, type PlatformHealth, type Platform } from '@/lib/types';
import { getStats } from '@/lib/jobs';
import { checkDependencies } from '@/lib/downloader';
import { isWorkerRunning } from '@/lib/worker';
import { getActiveCount } from '@/lib/ratelimit';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const startTime = Date.now();
const COOKIE_FILE = join(homedir(), 'Downloads', 'socialvault', '.cookies.txt');

export async function GET() {
  const deps = await checkDependencies();
  const stats = getStats();
  const hasCookies = existsSync(COOKIE_FILE);

  const platforms: Record<Platform, PlatformHealth> = {
    tiktok: {
      status: deps['yt-dlp'] ? 'operational' : 'down',
      last_checked: new Date().toISOString(),
    },
    instagram: {
      // Instagram needs gallery-dl. Without cookies it's degraded (public only).
      status: !deps['gallery-dl'] ? 'down' : hasCookies ? 'operational' : 'degraded',
      last_checked: new Date().toISOString(),
    },
  };

  const allOperational = Object.values(platforms).every((p) => p.status === 'operational');
  const anyDown = Object.values(platforms).some((p) => p.status === 'down');

  const response = createResponse({
    status: allOperational ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
    version: '2.1.0',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    worker_running: isWorkerRunning(),
    active_downloads: getActiveCount(),
    platforms,
    dependencies: deps,
    cookies: hasCookies ? 'found' : 'missing',
    cookie_path: COOKIE_FILE,
    jobs: stats,
  });

  return Response.json(response);
}
