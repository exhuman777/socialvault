import { createResponse } from '@/lib/types';
import { getStorageStats, getBaseDir, prepareZoUpload } from '@/lib/storage';
import { NextRequest } from 'next/server';

export async function GET() {
  const stats = getStorageStats();
  const response = createResponse({
    base_dir: getBaseDir(),
    ...stats,
  });
  return Response.json(response);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (body.action === 'prepare-zo-upload') {
    const zoDir = prepareZoUpload();
    return Response.json(
      createResponse({
        zo_upload_dir: zoDir,
        message: 'Files prepared for Zo upload. Open the folder and upload to zo.computer.',
      })
    );
  }

  return Response.json(
    createResponse({ error: 'Unknown action' }),
    { status: 400 }
  );
}
