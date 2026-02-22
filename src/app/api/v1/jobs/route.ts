import { NextRequest } from 'next/server';
import { createResponse, createError, type JobStatus } from '@/lib/types';
import { getRecentJobs, getJobsByStatus, getJob, setJobStatus, getStats } from '@/lib/jobs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const status = request.nextUrl.searchParams.get('status') as JobStatus | null;
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam) : 50;

  const validStatuses: JobStatus[] = ['queued', 'processing', 'completed', 'failed'];
  if (status && !validStatuses.includes(status)) {
    return createError(
      'INVALID_INPUT',
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      400
    );
  }

  const jobs = status ? getJobsByStatus(status) : getRecentJobs(limit);
  const stats = getStats();

  const response = createResponse({
    jobs: jobs.slice(0, limit).map((j) => ({
      id: j.id,
      status: j.status,
      platform: j.request.platform,
      target: j.request.target,
      mode: j.request.mode,
      progress: j.progress,
      created_at: j.created_at,
      started_at: j.started_at,
      completed_at: j.completed_at,
      error: j.error,
      item_count: j.result?.items?.length,
      download_path: j.result?.download_path,
    })),
    stats,
    total: jobs.length,
  });

  response.meta.latency_ms = Date.now() - startTime;
  return Response.json(response);
}

export async function DELETE(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('job_id');

  if (!jobId) {
    return createError('INVALID_INPUT', 'job_id query parameter is required', 400);
  }

  const job = getJob(jobId);
  if (!job) {
    return createError('JOB_NOT_FOUND', `No job found with id: ${jobId}`, 404);
  }

  if (job.status !== 'queued') {
    return createError(
      'INVALID_INPUT',
      `Cannot cancel job with status: ${job.status}. Only queued jobs can be cancelled.`,
      400
    );
  }

  setJobStatus(jobId, 'failed');
  return Response.json(createResponse({ cancelled: true, job_id: jobId }));
}
