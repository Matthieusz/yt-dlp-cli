import { describe, it, expect } from 'bun:test';
import { fetchInfo } from './info.ts';

describe('fetchInfo', () => {
  it('parses valid yt-dlp JSON output into VideoInfo', async () => {
    const rawJson = JSON.stringify({
      id: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      duration: 212,
      thumbnail: 'https://example.com/thumb.jpg',
      formats: [
        { format_id: '140', ext: 'm4a', resolution: 'audio only', vcodec: 'none', acodec: 'mp4a.40.2', filesize: 3386752 },
        { format_id: '247', ext: 'webm', resolution: '1280x720', vcodec: 'vp9', acodec: 'none', filesize: 12345678 },
      ],
      _type: 'video',
    });
    const fakeRun = async (_bin: string, _args: string[]) => ({
      success: true,
      stdout: rawJson,
      stderr: '',
    });

    const result = await fetchInfo('https://youtube.com/watch?v=dQw4w9WgXcQ', {
      binary: '/usr/bin/yt-dlp',
      run: fakeRun,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('dQw4w9WgXcQ');
      expect(result.value.title).toBe('Rick Astley - Never Gonna Give You Up');
      expect(result.value.type).toBe('video');
      expect(result.value.duration).toBe(212);
      expect(result.value.formats).toHaveLength(2);
      expect(result.value.formats[0]!.resolution).toBe('audio only');
      expect(result.value.formats[1]!.resolution).toBe('1280x720');
    }
  });

  it('returns FetchFailed when yt-dlp exits non-zero', async () => {
    const fakeRun = async (_bin: string, _args: string[]) => ({
      success: false,
      stdout: '',
      stderr: 'ERROR: Video unavailable',
    });

    const result = await fetchInfo('https://youtube.com/watch?v=private', {
      binary: '/usr/bin/yt-dlp',
      run: fakeRun,
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.tag === 'FetchFailed') {
      expect(result.error.stderr).toContain('Video unavailable');
    }
  });

  it('returns FetchFailed when JSON is invalid', async () => {
    const fakeRun = async (_bin: string, _args: string[]) => ({
      success: true,
      stdout: 'not json at all',
      stderr: '',
    });

    const result = await fetchInfo('https://youtube.com/watch?v=invalid', {
      binary: '/usr/bin/yt-dlp',
      run: fakeRun,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.tag).toBe('FetchFailed');
    }
  });
});
