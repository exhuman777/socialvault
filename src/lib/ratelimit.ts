// Simple concurrency guard — max simultaneous downloads
let activeDownloads = 0;
const MAX_CONCURRENT = 2;

export function canStartDownload(): boolean {
  return activeDownloads < MAX_CONCURRENT;
}

export function acquireSlot(): boolean {
  if (activeDownloads >= MAX_CONCURRENT) return false;
  activeDownloads++;
  return true;
}

export function releaseSlot(): void {
  activeDownloads = Math.max(0, activeDownloads - 1);
}

export function getActiveCount(): number {
  return activeDownloads;
}
