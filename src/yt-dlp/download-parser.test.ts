import { describe, it, expect } from 'bun:test';
import { parseOutputLine } from './download-parser.ts';

describe('parseOutputLine', () => {
  it('classifies progress lines', () => {
    const line = '[download]  12.5% of 123.45MiB at  5.67MiB/s ETA 00:19';
    const event = parseOutputLine(line, '');

    expect(event.tag).toBe('progress');
    if (event.tag === 'progress') {
      expect(event.progress.percent).toBe(12.5);
      expect(event.progress.speed).toBe('5.67MiB/s');
      expect(event.progress.eta).toBe('00:19');
    }
  });

  it('classifies destination lines', () => {
    const event = parseOutputLine(
      '[download] Destination: /home/user/video.mp4',
      '',
    );
    expect(event).toEqual({ tag: 'destination', path: '/home/user/video.mp4' });
  });

  it('classifies merger destination lines', () => {
    const event = parseOutputLine(
      '[Merger] Merging formats into "/tmp/merged.mp4"',
      '',
    );
    expect(event).toEqual({ tag: 'destination', path: '/tmp/merged.mp4' });
  });

  it('classifies already-downloaded with full path', () => {
    const event = parseOutputLine(
      '[download] /tmp/exists.mp4 has already been downloaded',
      '/some/fallback.mp4',
    );
    expect(event).toEqual({ tag: 'alreadyDownloaded', path: '/tmp/exists.mp4' });
  });

  it('classifies already-downloaded with fallback path', () => {
    const event = parseOutputLine(
      '[download] video.mp4 has already been downloaded',
      '/tmp/video.mp4',
    );
    expect(event).toEqual({ tag: 'alreadyDownloaded', path: '/tmp/video.mp4' });
  });

  it('returns ignored for unrecognised lines', () => {
    expect(parseOutputLine('[info] Available formats:', '')).toEqual({
      tag: 'ignored',
    });
    expect(parseOutputLine('[download] Starting download', '')).toEqual({
      tag: 'ignored',
    });
    expect(parseOutputLine('', '')).toEqual({ tag: 'ignored' });
  });

  it('prioritises alreadyDownloaded over destination', () => {
    // A line that matches both destination and already-downloaded is unlikely,
    // but we verify priority: already-downloaded is checked first
    const line = '[download] /tmp/v.mp4 has already been downloaded';
    const event = parseOutputLine(line, '');
    expect(event.tag).toBe('alreadyDownloaded');
  });

  it('prioritises destination over progress', () => {
    // Destination regex is checked before progress
    const event = parseOutputLine(
      '[download] Destination: /tmp/v.mp4',
      '',
    );
    expect(event.tag).toBe('destination');
  });
});
