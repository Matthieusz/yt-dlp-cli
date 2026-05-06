export type DownloadProgress = {
  percent: number;
  totalSize: string;
  speed: string;
  eta: string;
};

export type OutputLine =
  | { tag: 'progress'; progress: DownloadProgress }
  | { tag: 'destination'; path: string }
  | { tag: 'alreadyDownloaded'; path: string }
  | { tag: 'ignored' };

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
): { tag: 'skipped'; path: string } | null {
  const match = line.match(ALREADY_DOWNLOADED_RE);
  if (match?.[1]) {
    const path = match[1].includes('/') ? match[1] : defaultPath;
    return { tag: 'skipped', path };
  }
  return null;
}

/**
 * Parse a single line of yt-dlp output into a structured event.
 * Handles priority: already-downloaded beats destination beats progress.
 * @param line A line of yt-dlp stdout/stderr output
 * @param currentDestination The current known destination path (used as fallback for already-downloaded detection)
 */
export function parseOutputLine(
  line: string,
  currentDestination: string,
): OutputLine {
  const fileState = detectFileState(line, currentDestination);
  if (fileState) {
    return { tag: 'alreadyDownloaded', path: fileState.path };
  }

  const dest = parseDestinationLine(line);
  if (dest) {
    return { tag: 'destination', path: dest };
  }

  const progress = parseProgressLine(line);
  if (progress) {
    return { tag: 'progress', progress };
  }

  return { tag: 'ignored' };
}
