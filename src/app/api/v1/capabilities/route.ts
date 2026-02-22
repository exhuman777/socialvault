import { NextRequest } from 'next/server';
import { createResponse, type Capability, type Platform } from '@/lib/types';

const CAPABILITIES: Capability[] = [
  {
    id: 'tiktok-download',
    name: 'TikTok Download',
    description: 'Download TikTok videos, images, and carousels from profiles or single posts',
    platforms: ['tiktok'],
    content_types: ['video', 'image', 'carousel'],
    modes: ['profile', 'single'],
    rate_limit: {
      requests_per_minute: 10,
      max_items_per_request: 500,
    },
  },
  {
    id: 'instagram-download',
    name: 'Instagram Download',
    description: 'Download Instagram posts, reels, stories, and carousels from profiles or single posts',
    platforms: ['instagram'],
    content_types: ['video', 'image', 'carousel', 'story', 'reel'],
    modes: ['profile', 'single'],
    rate_limit: {
      requests_per_minute: 10,
      max_items_per_request: 500,
    },
  },
];

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const platformFilter = request.nextUrl.searchParams.get('platform') as Platform | null;

  let capabilities = CAPABILITIES;
  if (platformFilter) {
    capabilities = CAPABILITIES.filter((c) => c.platforms.includes(platformFilter));
  }

  const response = createResponse({
    capabilities,
    supported_platforms: ['tiktok', 'instagram'] as Platform[],
    usage: {
      download: 'POST /api/v1/download { "target": "https://tiktok.com/@user", "mode": "profile" }',
      status: 'GET /api/v1/download?job_id=sv_xxx',
      jobs: 'GET /api/v1/jobs',
    },
  });

  response.meta.latency_ms = Date.now() - startTime;
  return Response.json(response);
}
