import { Job, JobStatus, JobProgress, JobResult, DownloadRequest, generateId } from './types';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STORAGE_DIR = join(homedir(), 'Downloads', 'socialvault', '.socialvault');
const JOBS_FILE = join(STORAGE_DIR, 'jobs.json');

// Use globalThis so the job map is shared across Next.js module contexts
const g = globalThis as typeof globalThis & {
  __sv_jobs?: Map<string, Job>;
  __sv_jobs_loaded?: boolean;
};

function getJobs(): Map<string, Job> {
  if (!g.__sv_jobs) {
    g.__sv_jobs = new Map();
  }
  if (!g.__sv_jobs_loaded) {
    g.__sv_jobs_loaded = true;
    loadJobs();
  }
  return g.__sv_jobs;
}

function loadJobs(): void {
  try {
    if (existsSync(JOBS_FILE)) {
      const data = JSON.parse(readFileSync(JOBS_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        const jobs = getJobsMap();
        for (const job of data) {
          // Reset any stuck processing jobs to failed on reload
          if (job.status === 'processing') {
            job.status = 'failed';
            job.error = 'App restarted while processing';
            job.updated_at = new Date().toISOString();
          }
          jobs.set(job.id, job);
        }
      }
    }
  } catch {
    // First run or corrupted file — start fresh
  }
}

// Direct access without triggering load (used by loadJobs itself)
function getJobsMap(): Map<string, Job> {
  if (!g.__sv_jobs) {
    g.__sv_jobs = new Map();
  }
  return g.__sv_jobs;
}

function saveJobs(): void {
  try {
    if (!existsSync(STORAGE_DIR)) {
      mkdirSync(STORAGE_DIR, { recursive: true });
    }
    const data = Array.from(getJobs().values());
    writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[SocialVault] Failed to persist jobs:', err);
  }
}

export function createJob(request: DownloadRequest): Job {
  const jobs = getJobs();
  const job: Job = {
    id: generateId(),
    status: 'queued',
    request,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  saveJobs();
  return job;
}

export function getJob(id: string): Job | undefined {
  return getJobs().get(id);
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = getJobs().get(id);
  if (!job) return undefined;
  Object.assign(job, updates, { updated_at: new Date().toISOString() });
  saveJobs();
  return job;
}

export function setJobStatus(id: string, status: JobStatus): Job | undefined {
  const job = getJobs().get(id);
  if (!job) return undefined;
  job.status = status;
  job.updated_at = new Date().toISOString();
  if (status === 'processing') job.started_at = job.updated_at;
  if (status === 'completed' || status === 'failed') job.completed_at = job.updated_at;
  saveJobs();
  return job;
}

export function setJobProgress(
  id: string,
  completed: number,
  total: number,
  currentItem?: string
): Job | undefined {
  const job = getJobs().get(id);
  if (!job) return undefined;
  job.progress = {
    total,
    completed,
    current_item: currentItem,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
  job.updated_at = new Date().toISOString();
  saveJobs();
  return job;
}

export function setJobResult(id: string, result: JobResult): Job | undefined {
  const job = getJobs().get(id);
  if (!job) return undefined;
  job.result = result;
  job.status = 'completed';
  job.completed_at = new Date().toISOString();
  job.updated_at = job.completed_at;
  saveJobs();
  return job;
}

export function setJobError(id: string, error: string): Job | undefined {
  const job = getJobs().get(id);
  if (!job) return undefined;
  job.error = error;
  job.status = 'failed';
  job.completed_at = new Date().toISOString();
  job.updated_at = job.completed_at;
  saveJobs();
  return job;
}

export function getNextJob(): Job | undefined {
  for (const job of getJobs().values()) {
    if (job.status === 'queued') return job;
  }
  return undefined;
}

export function getJobsByStatus(status: JobStatus): Job[] {
  return Array.from(getJobs().values()).filter((j) => j.status === status);
}

export function getRecentJobs(limit = 100): Job[] {
  return Array.from(getJobs().values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export function cleanupOldJobs(maxAgeMs = 24 * 60 * 60 * 1000): number {
  const jobs = getJobs();
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  for (const [id, job] of jobs.entries()) {
    if (
      (job.status === 'completed' || job.status === 'failed') &&
      new Date(job.created_at).getTime() < cutoff
    ) {
      jobs.delete(id);
      removed++;
    }
  }
  if (removed > 0) saveJobs();
  return removed;
}

export function getStats() {
  const all = Array.from(getJobs().values());
  return {
    total: all.length,
    queued: all.filter((j) => j.status === 'queued').length,
    processing: all.filter((j) => j.status === 'processing').length,
    completed: all.filter((j) => j.status === 'completed').length,
    failed: all.filter((j) => j.status === 'failed').length,
  };
}
