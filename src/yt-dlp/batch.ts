import type { DownloadProgress, DownloadResult } from './download.ts';

export type BatchEntry = {
  url: string;
  title: string;
};

export type BatchResult = {
  items: BatchItem[];
  downloaded: number;
  skipped: number;
  failed: number;
};

export type BatchItem = {
  entry: BatchEntry;
  result: DownloadResult;
};

export type BatchProgressFn = (
  entry: BatchEntry,
  current: number,
  total: number,
  progress: DownloadProgress,
) => void;

export type BatchItemCompleteFn = (
  entry: BatchEntry,
  current: number,
  total: number,
  result: DownloadResult,
) => void;

export type BatchDownloadFn = (
  url: string,
  onProgress?: (progress: DownloadProgress) => void,
) => Promise<DownloadResult>;

export type RunBatchOpts = {
  download: BatchDownloadFn;
  entries: BatchEntry[];
  onProgress?: BatchProgressFn;
  onItemComplete?: BatchItemCompleteFn;
};

export async function runBatch(opts: RunBatchOpts): Promise<BatchResult> {
  const { download, entries, onProgress, onItemComplete } = opts;
  const total = entries.length;
  const items: BatchItem[] = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    const result = await download(entry.url, (progress) => {
      onProgress?.(entry, i + 1, total, progress);
    });

    onItemComplete?.(entry, i + 1, total, result);

    switch (result.tag) {
      case 'downloaded':
      case 'resumed':
        downloaded++;
        break;
      case 'skipped':
        skipped++;
        break;
      case 'failed':
        failed++;
        break;
    }

    items.push({ entry, result });
  }

  return { items, downloaded, skipped, failed };
}
