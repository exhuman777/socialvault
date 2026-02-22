import { NextRequest } from 'next/server';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { createResponse, createError } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();

    if (!path || typeof path !== 'string') {
      return createError('INVALID_INPUT', 'path is required', 400);
    }

    // Security: only allow opening paths under ~/Downloads/socialvault/
    const home = process.env.HOME || '/tmp';
    const allowedPrefix = `${home}/Downloads/socialvault/`;
    if (!path.startsWith(allowedPrefix)) {
      return createError('INVALID_INPUT', 'Can only open paths within socialvault downloads', 403);
    }

    if (!existsSync(path)) {
      return createError('CONTENT_UNAVAILABLE', 'Path does not exist', 404);
    }

    // Open in Finder (macOS) / file manager
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFile(opener, [path], (err) => {
      if (err) console.error('[open-folder]', err.message);
    });

    return Response.json(createResponse({ opened: true, path }));
  } catch {
    return createError('INTERNAL_ERROR', 'Failed to open folder', 500);
  }
}
