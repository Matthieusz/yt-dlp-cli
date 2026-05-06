import { describe, it, expect } from 'bun:test';
import { groupFormats } from './formats.ts';
import type { Format } from '../types.ts';

describe('groupFormats', () => {
  it('separates audio-only formats from video formats', () => {
    const formats: Format[] = [
      { id: '140', ext: 'm4a', resolution: 'audio only', vcodec: 'none', acodec: 'mp4a.40.2', filesize: 3386752 },
      { id: '247', ext: 'webm', resolution: '1280x720', vcodec: 'vp9', acodec: 'none' },
      { id: '22', ext: 'mp4', resolution: '1280x720', vcodec: 'avc1.64001F', acodec: 'mp4a.40.2', filesize: 12345678 },
    ];

    const result = groupFormats(formats);

    expect(result.shortcuts).toHaveLength(2);
    expect(result.shortcuts[0]!.id).toBe('22'); // best video+audio
    expect(result.shortcuts[1]!.id).toBe('140'); // best audio
  });

  it('groups video formats by resolution', () => {
    const formats: Format[] = [
      { id: '247', ext: 'webm', resolution: '1280x720', vcodec: 'vp9', acodec: 'none' },
      { id: '136', ext: 'mp4', resolution: '1280x720', vcodec: 'avc1.4d401f', acodec: 'none' },
      { id: '248', ext: 'webm', resolution: '1920x1080', vcodec: 'vp9', acodec: 'none' },
    ];

    const result = groupFormats(formats);

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]!.resolution).toBe('1920x1080');
    expect(result.groups[1]!.resolution).toBe('1280x720');
    expect(result.groups[1]!.formats).toHaveLength(2);
  });

  it('sorts groups by resolution descending', () => {
    const formats: Format[] = [
      { id: '394', ext: 'mp4', resolution: '640x360', vcodec: 'av1', acodec: 'none' },
      { id: '247', ext: 'webm', resolution: '1280x720', vcodec: 'vp9', acodec: 'none' },
      { id: '248', ext: 'webm', resolution: '1920x1080', vcodec: 'vp9', acodec: 'none' },
      { id: '395', ext: 'mp4', resolution: '256x144', vcodec: 'av1', acodec: 'none' },
    ];

    const result = groupFormats(formats);

    const resolutions = result.groups.map((g) => g.resolution);
    expect(resolutions).toEqual(['1920x1080', '1280x720', '640x360', '256x144']);
  });

  it('handles empty formats', () => {
    const result = groupFormats([]);

    expect(result.shortcuts).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it('handles all audio-only formats', () => {
    const formats: Format[] = [
      { id: '140', ext: 'm4a', resolution: 'audio only', vcodec: 'none', acodec: 'mp4a.40.2', filesize: 3386752 },
      { id: '251', ext: 'webm', resolution: 'audio only', vcodec: 'none', acodec: 'opus', filesize: 2800000 },
    ];

    const result = groupFormats(formats);

    expect(result.shortcuts).toHaveLength(1);
    expect(result.shortcuts[0]!.id).toBe('140'); // larger filesize
    expect(result.groups).toEqual([]);
  });
});
