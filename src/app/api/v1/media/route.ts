import { NextRequest } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import { join, extname, resolve, normalize } from 'path';
import { homedir } from 'os';
import { Readable } from 'stream';

const BASE_DIR = join(homedir(), 'Downloads', 'socialvault');

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');

  if (!filePath) {
    return new Response('Missing path parameter', { status: 400 });
  }

  // Security: resolve and verify path stays within BASE_DIR
  const resolved = resolve(BASE_DIR, normalize(filePath));
  if (!resolved.startsWith(BASE_DIR)) {
    return new Response('Access denied', { status: 403 });
  }

  if (!existsSync(resolved)) {
    return new Response('File not found', { status: 404 });
  }

  const ext = extname(resolved).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    return new Response('Unsupported file type', { status: 415 });
  }

  const stat = statSync(resolved);
  const range = request.headers.get('range');

  // Range request support for video seeking
  if (range && mimeType.startsWith('video/')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    const stream = createReadStream(resolved, { start, end });
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new Response(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const stream = createReadStream(resolved);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
