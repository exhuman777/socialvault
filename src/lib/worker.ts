import { getNextJob, setJobStatus, setJobProgress, setJobResult, setJobError } from './jobs';
import { downloadContent } from './downloader';
import { acquireSlot, releaseSlot } from './ratelimit';

let running = false;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;

export function startWorker(): void {
  if (running) return;
  running = true;
  console.log('[SocialVault] Worker started — polling for jobs');
  schedulePoll();
}

export function stopWorker(): void {
  running = false;
  if (pollTimeout) {
    clearTimeout(pollTimeout);
    pollTimeout = null;
  }
  console.log('[SocialVault] Worker stopped');
}

/**
 * Schedule the next poll. Uses setTimeout chain (not setInterval)
 * so the next poll only fires AFTER the current job finishes.
 */
function schedulePoll(): void {
  if (!running) return;
  pollTimeout = setTimeout(async () => {
    await processNextJob();
    schedulePoll(); // Chain: poll again after job completes (or immediately if no job)
  }, 1000);
}

async function processNextJob(): Promise<void> {
  if (!acquireSlot()) return; // All slots busy

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
  return running;
}
