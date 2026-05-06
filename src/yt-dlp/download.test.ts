import { describe, it, expect } from 'bun:test';
import { parseProgressLine, parseDestinationLine, detectFileState } from './download.ts';

describe('parseProgressLine', () => {
  it('parses a standard yt-dlp progress line', () => {
    const line = '[download]  12.5% of 123.45MiB at  5.67MiB/s ETA 00:19';
    const result = parseProgressLine(line);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.percent).toBe(12.5);
    expect(result.totalSize).toBe('123.45MiB');
    expect(result.speed).toBe('5.67MiB/s');
    expect(result.eta).toBe('00:19');
  });

  it('parses a line with approximate size (~ prefix)', () => {
    const line = '[download]   0.3% of ~12.34MiB at Unknown speed ETA Unknown';
    const result = parseProgressLine(line);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.percent).toBe(0.3);
    expect(result.totalSize).toBe('~12.34MiB');
    expect(result.speed).toBe('Unknown speed');
    expect(result.eta).toBe('Unknown');
  });

  it('returns null for non-progress lines', () => {
    expect(parseProgressLine('[info] Available formats for dQw4w9WgXcQ:')).toBeNull();
    expect(parseProgressLine('Some random output')).toBeNull();
    expect(parseProgressLine('')).toBeNull();
  });

  it('parses 100% progress', () => {
    const line = '[download] 100.0% of 50.00MiB at  2.00MiB/s ETA 00:00';
    const result = parseProgressLine(line);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.percent).toBe(100.0);
    expect(result.eta).toBe('00:00');
  });
});

describe('parseDestinationLine', () => {
  it('extracts destination path from download completion', () => {
    const result = parseDestinationLine('[download] Destination: /home/user/downloads/video.mp4');
    expect(result).toBe('/home/user/downloads/video.mp4');
  });

  it('extracts path from merger completion', () => {
    const result = parseDestinationLine('[Merger] Merging formats into "/home/user/downloads/video.mp4"');
    expect(result).toBe('/home/user/downloads/video.mp4');
  });

  it('returns null for non-destination lines', () => {
    expect(parseDestinationLine('[download] Starting download')).toBeNull();
    expect(parseDestinationLine('')).toBeNull();
  });
});

describe('detectFileState', () => {
  it('detects already-downloaded message', () => {
    const result = detectFileState(
      '[download] video.mp4 has already been downloaded',
      '/tmp/video.mp4',
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result).toEqual({ tag: 'skipped', path: '/tmp/video.mp4' });
  });

  it('detects already-downloaded with full path', () => {
    const result = detectFileState(
      '[download] /home/user/downloads/video.mp4 has already been downloaded',
      '/home/user/downloads/video.mp4',
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result).toEqual({ tag: 'skipped', path: '/home/user/downloads/video.mp4' });
  });

  it('returns null for non-state lines', () => {
    expect(detectFileState('[download] Starting', '/tmp/video.mp4')).toBeNull();
  });
});
