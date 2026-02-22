import { getNextJob, setJobStatus, setJobProgress, setJobResult, setJobError } from './jobs';
import { downloadContent } from './downloader';
import { acquireSlot, releaseSlot } from './ratelimit';

// Use globalThis so state is shared across Next.js module contexts
// (instrumentation.ts and API routes compile into separate bundles)
const g = globalThis as typeof globalThis & {
  __sv_worker_running?: boolean;
  __sv_poll_timeout?: ReturnType<typeof setTimeout>;
};

export function startWorker(): void {
  if (g.__sv_worker_running) return;
  g.__sv_worker_running = true;
  console.log('[SocialVault] Worker started — polling for jobs');
  schedulePoll();
}

export function stopWorker(): void {
  g.__sv_worker_running = false;
  if (g.__sv_poll_timeout) {
    clearTimeout(g.__sv_poll_timeout);
    g.__sv_poll_timeout = undefined;
  }
  console.log('[SocialVault] Worker stopped');
}

function schedulePoll(): void {
  if (!g.__sv_worker_running) return;
  g.__sv_poll_timeout = setTimeout(async () => {
    await processNextJob();
    schedulePoll();
  }, 1000);
}

async function processNextJob(): Promise<void> {
  if (!acquireSlot()) return;

  const job = getNextJob();
  if (!job) {
    releaseSlot();
    return;
  }

  const jobId = job.id;
  const target = job.request.target;
  console.log(`[SocialVault] Processing job ${jobId}: ${target}`);
  setJobStatus(jobId, 'processing');

  try {
    const result = await downloadContent(job.request, {
      onProgress: (completed, total, currentItem) => {
        setJobProgress(jobId, completed, total, currentItem);
      },
      onStatusChange: (status) => {
        console.log(`[SocialVault] Job ${jobId}: ${status}`);
      },
    });

    setJobResult(jobId, result);
    console.log(`[SocialVault] Job ${jobId} completed: ${result.items.length} items`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setJobError(jobId, message);
    console.error(`[SocialVault] Job ${jobId} failed:`, message);
  } finally {
    releaseSlot();
  }
}

export function isWorkerRunning(): boolean {
  return !!g.__sv_worker_running;
}
