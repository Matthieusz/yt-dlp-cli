import type { YtDlpError } from '../errors.ts';

export type DownloadProgress = {
  percent: number;
  totalSize: string;
  speed: string;
  eta: string;
};

export type DownloadResult =
  | { tag: 'downloaded'; path: string }
  | { tag: 'skipped'; path: string }
  | { tag: 'resumed'; path: string; percent: number }
  | { tag: 'failed'; error: YtDlpError };

const PROGRESS_RE = /^\[download\]\s+(\d+\.?\d*)%\s+of\s+(~?\s*[\d.]+[KMG]?i?B)\s+at\s+(.+?)\s+ETA\s+(\S+)/;

export function parseProgressLine(line: string): DownloadProgress | null {
  const match = line.match(PROGRESS_RE);
  if (!match?.[1] || !match?.[2] || !match?.[3] || !match?.[4]) return null;

  return {
    percent: parseFloat(match[1]),
    totalSize: match[2].trim(),
    speed: match[3],
    eta: match[4],
  };
}

const DESTINATION_RE = /^\[(?:download|Merger)\].*Destination:\s+(.+)/;
const MERGER_PATH_RE = /^\[Merger\]\s+Merging formats into\s+"(.+)"/;

export function parseDestinationLine(line: string): string | null {
  const destMatch = line.match(DESTINATION_RE);
  if (destMatch?.[1]) return destMatch[1];

  const mergerMatch = line.match(MERGER_PATH_RE);
  if (mergerMatch?.[1]) return mergerMatch[1];

  return null;
}

const ALREADY_DOWNLOADED_RE = /^\[download\]\s+(.+?)\s+has already been downloaded/;

export function detectFileState(
  line: string,
  defaultPath: string,
): DownloadResult | null {
  const match = line.match(ALREADY_DOWNLOADED_RE);
  if (match?.[1]) {
    const path = match[1].includes('/') ? match[1] : defaultPath;
    return { tag: 'skipped', path };
  }
  return null;
}

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
  const PROGRESS_INTERVAL = 100; // ms between progress callbacks

  // Read stdout line by line for progress
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
        // Check for file state
        const fileState = detectFileState(line, destinationPath);
        if (fileState) {
          reader.releaseLock();
          proc.kill();
          return fileState;
        }

        // Check for destination
        const dest = parseDestinationLine(line);
        if (dest) {
          destinationPath = dest;
        }

        // Parse progress — throttle callbacks to avoid flickering
        const progress = parseProgressLine(line);
        if (progress) {
          lastProgress = progress;
          const now = Date.now();
          if (now - lastProgressEmit >= PROGRESS_INTERVAL) {
            lastProgressEmit = now;
            opts.onProgress?.(progress);
          }
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }

  // Flush final progress update
  if (lastProgress) {
    opts.onProgress?.(lastProgress);
  }

  // Wait for process to finish
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
