// SocialVault Types — Open Source Edition

export type Platform = 'tiktok' | 'instagram';

export type ContentType = 'video' | 'image' | 'carousel' | 'story' | 'reel';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface DownloadRequest {
  target: string;
  platform?: Platform;
  mode: 'profile' | 'single';
  content_types?: ContentType[];
  include_metadata?: boolean;
  limit?: number;
}

export interface APIResponse<T = unknown> {
  '@context': string;
  '@type': string;
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    request_id: string;
    latency_ms?: number;
  };
}

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_URL'
  | 'INVALID_PLATFORM'
  | 'RATE_LIMITED'
  | 'PLATFORM_ERROR'
  | 'CONTENT_UNAVAILABLE'
  | 'JOB_NOT_FOUND'
  | 'INTERNAL_ERROR';

export interface Job {
  id: string;
  status: JobStatus;
  request: DownloadRequest;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  progress?: JobProgress;
  result?: JobResult;
  error?: string;
}

export interface JobProgress {
  total: number;
  completed: number;
  current_item?: string;
  percent: number;
}

export interface JobResult {
  platform: Platform;
  username: string;
  items: ContentItem[];
  total_size_bytes: number;
  download_path: string;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  url?: string;
  thumbnail_url?: string;
  filename: string;
  size_bytes: number;
  duration_seconds?: number;
  caption?: string;
  hashtags?: string[];
  created_at?: string;
  metrics?: ContentMetrics;
}

export interface ContentMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  content_types: ContentType[];
  modes: ('profile' | 'single')[];
  rate_limit: {
    requests_per_minute: number;
    max_items_per_request: number;
  };
}

export interface PlatformHealth {
  status: 'operational' | 'degraded' | 'down';
  latency_ms?: number;
  last_checked?: string;
  success_rate?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  platforms: Record<Platform, PlatformHealth>;
}

// Helper functions

export function createResponse<T>(data: T, requestId?: string): APIResponse<T> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Action',
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId || generateId(),
    },
  };
}

export function createError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  const body: APIResponse = {
    '@context': 'https://schema.org',
    '@type': 'Action',
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: generateId(),
    },
  };
  return Response.json(body, { status });
}

export function detectPlatform(url: string): Platform | null {
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com') || lower.includes('vm.tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
  return null;
}

export function generateId(): string {
  return `sv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
