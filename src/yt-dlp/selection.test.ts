import { describe, it, expect } from 'bun:test';
import { resolveFormat } from './selection.ts';
import type { Format } from '../types.ts';

const audioOnly: Format = {
  id: '140', ext: 'm4a', resolution: 'audio only',
  vcodec: 'none', acodec: 'mp4a.40.2', filesize: 3_000_000,
};

const videoOnly: Format = {
  id: '247', ext: 'webm', resolution: '1280x720',
  vcodec: 'vp9', acodec: 'none', filesize: 12_000_000,
};

const combined: Format = {
  id: '22', ext: 'mp4', resolution: '1280x720',
  vcodec: 'avc1.64001F', acodec: 'mp4a.40.2', filesize: 15_000_000,
};

describe('resolveFormat', () => {
  it('uses yt-dlp bestvideo+bestaudio selector when --best is set', () => {
    const result = resolveFormat([audioOnly, videoOnly, combined], { best: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.formatId).toBe('bestvideo+bestaudio/best');
    }
  });

  it('uses yt-dlp bestaudio selector when --audio-only is set', () => {
    const result = resolveFormat([audioOnly, videoOnly, combined], { audioOnly: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.formatId).toBe('bestaudio/best');
    }
  });

  it('uses format ID directly when --format is set', () => {
    const result = resolveFormat([audioOnly], { format: '137+140' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.formatId).toBe('137+140');
    }
  });

  it('returns NoFormats when list is empty', () => {
    const result = resolveFormat([], {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.tag).toBe('NoFormats');
    }
  });
});
