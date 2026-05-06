import type { YtDlpError } from '../errors.ts';
import {
  type DownloadProgress,
  parseOutputLine,
} from './download-parser.ts';

export type { DownloadProgress } from './download-parser.ts';
export {
  parseProgressLine,
  parseDestinationLine,
  detectFileState,
} from './download-parser.ts';

export type DownloadResult =
  | { tag: 'downloaded'; path: string }
  | { tag: 'skipped'; path: string }
  | { tag: 'resumed'; path: string; percent: number }
  | { tag: 'failed'; error: YtDlpError };

export type ProgressCallback = (progress: DownloadProgress) => void;

export type DownloadVideoOpts = {
  binary: string;
  formatId: string;
  outDir: string;
  outTemplate: string;
  url: string;
  onProgress?: ProgressCallback;
};

export async function downloadVideo(
  opts: DownloadVideoOpts,
): Promise<DownloadResult> {
  const args = [
    '-f', opts.formatId,
    '-o', `${opts.outDir}/${opts.outTemplate}`,
    '--newline',
    '--no-playlist',
    opts.url,
  ];

  const proc = Bun.spawn([opts.binary, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let lastProgress: DownloadProgress | null = null;
  let destinationPath = '';
  let lastProgressEmit = 0;
  const PROGRESS_INTERVAL = 100;

  const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const event = parseOutputLine(line, destinationPath);

        switch (event.tag) {
          case 'alreadyDownloaded': {
            reader.releaseLock();
            proc.kill();
            return { tag: 'skipped', path: event.path };
          }
          case 'destination':
            destinationPath = event.path;
            break;
          case 'progress':
            lastProgress = event.progress;
            if (Date.now() - lastProgressEmit >= PROGRESS_INTERVAL) {
              lastProgressEmit = Date.now();
              opts.onProgress?.(event.progress);
            }
            break;
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }

  if (lastProgress) {
    opts.onProgress?.(lastProgress);
  }

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    return {
      tag: 'failed',
      error: {
        tag: 'DownloadFailed',
        url: opts.url,
        stderr,
      },
    };
  }

  return {
    tag: 'downloaded',
    path: destinationPath || `${opts.outDir}/${opts.outTemplate}`,
  };
}
