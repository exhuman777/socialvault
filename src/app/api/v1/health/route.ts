import { createResponse, type PlatformHealth, type Platform } from '@/lib/types';
import { getStats } from '@/lib/jobs';
import { checkDependencies } from '@/lib/downloader';
import { isWorkerRunning } from '@/lib/worker';
import { getActiveCount } from '@/lib/ratelimit';

const startTime = Date.now();

export async function GET() {
  const deps = await checkDependencies();
  const stats = getStats();

  const platforms: Record<Platform, PlatformHealth> = {
    tiktok: {
      status: deps['yt-dlp'] ? 'operational' : 'down',
      last_checked: new Date().toISOString(),
    },
    instagram: {
      status: deps['gallery-dl'] && deps['yt-dlp'] ? 'operational' : 'down',
      last_checked: new Date().toISOString(),
    },
  };

  const allOperational = Object.values(platforms).every((p) => p.status === 'operational');
  const anyDown = Object.values(platforms).some((p) => p.status === 'down');

  const response = createResponse({
    status: allOperational ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
    version: '2.0.0',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    worker_running: isWorkerRunning(),
    active_downloads: getActiveCount(),
    platforms,
    dependencies: deps,
    jobs: stats,
  });

  return Response.json(response);
}
