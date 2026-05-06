import type { DownloadProgress } from '../yt-dlp/download.ts';

export function formatProgressBar(
  progress: DownloadProgress,
  width: number,
): string {
  const filled = Math.round((progress.percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${progress.percent}%`;
}

export function formatSingleProgress(progress: DownloadProgress): string {
  const bar = formatProgressBar(progress, 20);
  return `${bar} | ${progress.speed} | ETA ${progress.eta}`;
}

export function formatBatchProgress(
  current: number,
  total: number,
  title: string,
  progress: DownloadProgress,
): string {
  const bar = formatProgressBar(progress, 20);
  const truncated = title.length > 50 ? title.slice(0, 47) + '...' : title;
  return `[${current}/${total}] ${truncated} | ${bar} | ${progress.speed} | ETA ${progress.eta}`;
}

export type BatchSummary = {
  downloaded: number;
  skipped: number;
  failed: number;
};

export function formatBatchSummary(counts: BatchSummary): string {
  const total = counts.downloaded + counts.skipped + counts.failed;
  return [
    '─'.repeat(50),
    `Total: ${total} video(s) | Downloaded: ${counts.downloaded} | Skipped: ${counts.skipped} | Failed: ${counts.failed}`,
  ].join('\n');
}
