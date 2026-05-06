import { describe, it, expect } from 'bun:test';
import {
  groupFormats,
  buildFormatChoices,
  buildFormatDetailChoices,
  CUSTOM_FORMAT_SENTINEL,
} from './formats.ts';
import type { Format } from '../types.ts';
import type { FormatGroup } from './formats.ts';

describe('groupFormats', () => {
  it('separates audio-only formats from video formats', () => {
    const formats: Format[] = [
      { id: '140', ext: 'm4a', resolution: 'audio only', vcodec: 'none', acodec: 'mp4a.40.2', filesize: 3386752 },
      { id: '247', ext: 'webm', resolution: '1280x720', vcodec: 'vp9', acodec: 'none' },
      { id: '22', ext: 'mp4', resolution: '1280x720', vcodec: 'avc1.64001F', acodec: 'mp4a.40.2', filesize: 12345678 },
    ];

    const result = groupFormats(formats);

    expect(result.shortcuts).toHaveLength(2);
    expect(result.shortcuts[0]!.id).toBe('22');
    expect(result.shortcuts[1]!.id).toBe('140');
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
    expect(result.shortcuts[0]!.id).toBe('140');
    expect(result.groups).toEqual([]);
  });
});

const audioFormat: Format = {
  id: '140', ext: 'm4a', resolution: 'audio only',
  vcodec: 'none', acodec: 'mp4a.40.2', filesize: 3_000_000,
};

const videoGroup: FormatGroup = {
  resolution: '1920x1080',
  formats: [{
    id: '137', ext: 'mp4', resolution: '1920x1080',
    vcodec: 'avc1.640028', acodec: 'none', filesize: 50_000_000,
  }],
};

describe('buildFormatChoices', () => {
  it('always includes best video option first', () => {
    const choices = buildFormatChoices([], []);

    expect(choices[0]!.value).toBe('bestvideo+bestaudio/best');
    expect(choices[0]!.label).toContain('Best video');
  });

  it('includes best audio when audio shortcut exists', () => {
    const choices = buildFormatChoices([audioFormat], []);

    const audioChoice = choices.find((c) => c.value === 'bestaudio/best');
    expect(audioChoice).toBeDefined();
    expect(audioChoice!.label).toContain('mp4a.40.2');
    expect(audioChoice!.label).toContain('2.9 MB');
  });

  it('omits best audio when no audio shortcut', () => {
    const choices = buildFormatChoices([], []);

    expect(choices.find((c) => c.value === 'bestaudio/best')).toBeUndefined();
  });

  it('includes custom option when groups exist', () => {
    const choices = buildFormatChoices([], [videoGroup]);

    const custom = choices.find((c) => c.value === CUSTOM_FORMAT_SENTINEL);
    expect(custom).toBeDefined();
    expect(custom!.label).toBe('Custom... (pick from all formats)');
  });

  it('omits custom option when no groups', () => {
    const choices = buildFormatChoices([], []);

    expect(choices.find((c) => c.value === CUSTOM_FORMAT_SENTINEL)).toBeUndefined();
  });
});

describe('buildFormatDetailChoices', () => {
  it('builds labeled choices from format groups', () => {
    const choices = buildFormatDetailChoices([videoGroup]);

    expect(choices).toHaveLength(1);
    expect(choices[0]!.value).toBe('137');
    expect(choices[0]!.label).toContain('[V]');
    expect(choices[0]!.label).toContain('1920x1080');
    expect(choices[0]!.label).toContain('mp4');
    expect(choices[0]!.label).toContain('avc1.640028');
    expect(choices[0]!.label).toContain('47.7 MB');
  });

  it('handles empty groups', () => {
    expect(buildFormatDetailChoices([])).toEqual([]);
  });

  it('labels audio-only formats with [A]', () => {
    const group: FormatGroup = {
      resolution: 'audio only',
      formats: [{ ...audioFormat }],
    };
    const choices = buildFormatDetailChoices([group]);

    expect(choices[0]!.label).toContain('[A]');
  });

  it('labels combined formats with [AV]', () => {
    const group: FormatGroup = {
      resolution: '1280x720',
      formats: [{
        id: '22', ext: 'mp4', resolution: '1280x720',
        vcodec: 'avc1.64001F', acodec: 'mp4a.40.2',
      }],
    };
    const choices = buildFormatDetailChoices([group]);

    expect(choices[0]!.label).toContain('[AV]');
  });

  it('flattens multiple groups into a single list', () => {
    const groups: FormatGroup[] = [
      {
        resolution: '1920x1080',
        formats: [{
          id: '137', ext: 'mp4', resolution: '1920x1080',
          vcodec: 'avc1', acodec: 'none',
        }],
      },
      {
        resolution: '1280x720',
        formats: [{
          id: '136', ext: 'mp4', resolution: '1280x720',
          vcodec: 'avc1', acodec: 'none',
        }],
      },
    ];
    const choices = buildFormatDetailChoices(groups);

    expect(choices).toHaveLength(2);
    expect(choices[0]!.value).toBe('137');
    expect(choices[1]!.value).toBe('136');
  });

  it('omits file size when filesize is undefined', () => {
    const group: FormatGroup = {
      resolution: '1280x720',
      formats: [{
        id: '136', ext: 'mp4', resolution: '1280x720',
        vcodec: 'avc1', acodec: 'none',
      }],
    };
    const choices = buildFormatDetailChoices([group]);

    expect(choices[0]!.label).not.toContain('MB');
  });
});
