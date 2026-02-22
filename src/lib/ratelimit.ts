// Use globalThis so state is shared across Next.js module contexts
const g = globalThis as typeof globalThis & {
  __sv_active_downloads?: number;
};

const MAX_CONCURRENT = 2;

function getActive(): number {
  return g.__sv_active_downloads ?? 0;
}

export function canStartDownload(): boolean {
  return getActive() < MAX_CONCURRENT;
}

export function acquireSlot(): boolean {
  if (getActive() >= MAX_CONCURRENT) return false;
  g.__sv_active_downloads = getActive() + 1;
  return true;
}

export function releaseSlot(): void {
  g.__sv_active_downloads = Math.max(0, getActive() - 1);
}

export function getActiveCount(): number {
  return getActive();
}
