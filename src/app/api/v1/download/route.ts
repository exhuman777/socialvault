import { NextRequest } from 'next/server';
import { createResponse, createError, detectPlatform, type Platform, type DownloadRequest } from '@/lib/types';
import { createJob, getJob } from '@/lib/jobs';

const validPlatforms: Platform[] = ['tiktok', 'instagram'];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { target, platform, mode = 'single', content_types, include_metadata, limit } = body;

    if (!target || typeof target !== 'string') {
      return createError('INVALID_INPUT', 'target is required', 400);
    }

    // Detect or validate platform
    let resolvedPlatform: Platform;
    if (platform) {
      if (!validPlatforms.includes(platform)) {
        return createError(
          'INVALID_PLATFORM',
          `Unsupported platform: ${platform}. Supported: ${validPlatforms.join(', ')}`,
          400
        );
      }
      resolvedPlatform = platform;
    } else {
      const detected = detectPlatform(target);
      if (!detected) {
        return createError(
          'INVALID_URL',
          'Could not detect platform from URL. Provide a TikTok or Instagram URL, or specify platform explicitly.',
          400
        );
      }
      resolvedPlatform = detected;
    }

    // Validate mode
    if (mode !== 'profile' && mode !== 'single') {
      return createError('INVALID_INPUT', 'mode must be "profile" or "single"', 400);
    }

    const downloadRequest: DownloadRequest = {
      target: target.trim(),
      platform: resolvedPlatform,
      mode,
      content_types,
      include_metadata: include_metadata ?? true,
      limit,
    };

    const job = createJob(downloadRequest);

    const response = createResponse({
      job_id: job.id,
      status: job.status,
      platform: resolvedPlatform,
      mode,
      created_at: job.created_at,
      estimated_time_seconds: mode === 'profile' ? 60 : 15,
    });

    response.meta.latency_ms = Date.now() - startTime;

    return new Response(JSON.stringify(response), {
      status: 202,
      headers: {
        'Content-Type': 'application/json',
        Location: `/api/v1/download?job_id=${job.id}`,
      },
    });
  } catch (err) {
    console.error('[Download API] Error:', err);
    return createError('INTERNAL_ERROR', 'Failed to create download job', 500);
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const jobId = request.nextUrl.searchParams.get('job_id');

  if (!jobId) {
    return createError('INVALID_INPUT', 'job_id query parameter is required', 400);
  }

  const job = getJob(jobId);
  if (!job) {
    return createError('JOB_NOT_FOUND', `No job found with id: ${jobId}`, 404);
  }

  const response = createResponse({
    id: job.id,
    status: job.status,
    progress: job.progress,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
    result: job.result,
    error: job.error,
  });

  response.meta.latency_ms = Date.now() - startTime;
  return Response.json(response);
}
