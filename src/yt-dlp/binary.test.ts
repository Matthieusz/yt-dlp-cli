import { describe, it, expect } from 'bun:test';
import { locate, validate, download, ensure } from './binary.ts';

describe('locate', () => {
  it('returns the path when yt-dlp is found on PATH', async () => {
    const fakeWhich = (name: string): string | null =>
      name === 'yt-dlp' ? '/usr/local/bin/yt-dlp' : null;

    const result = await locate({ which: fakeWhich });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe('/usr/local/bin/yt-dlp');
      expect(result.source).toBe('system');
    }
  });

  it('returns BinaryNotFound error when yt-dlp is not on PATH', async () => {
    const alwaysNull = (_name: string): string | null => null;

    const result = await locate({ which: alwaysNull });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.tag).toBe('BinaryNotFound');
    }
  });
});

describe('validate', () => {
  it('returns ok when binary runs --version successfully', async () => {
    const fakeRun = async (_bin: string, _args: string[]) => ({
      success: true,
      stdout: '2024.01.01',
      stderr: '',
    });

    const result = await validate('/usr/bin/yt-dlp', { run: fakeRun });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe('/usr/bin/yt-dlp');
      expect(result.source).toBe('system');
    }
  });

  it('returns BinaryNotFound when binary fails version check', async () => {
    const fakeRun = async (_bin: string, _args: string[]) => ({
      success: false,
      stdout: '',
      stderr: 'exec format error',
    });

    const result = await validate('/fake/yt-dlp', { run: fakeRun });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.tag).toBe('BinaryNotFound');
    }
  });
});

describe('download', () => {
  it('downloads yt-dlp binary for linux x64', async () => {
    const binaryData = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
    const fakeFetch = async (_url: string): Promise<Uint8Array> => binaryData;
    const fakeFs = {
      mkdir: async (_path: string) => {},
      writeFile: async (_path: string, _data: Uint8Array) => {},
      chmod: async (_path: string, _mode: number) => {},
    };

    const result = await download({
      platform: 'linux',
      arch: 'x64',
      fetch: fakeFetch,
      fs: fakeFs,
      installDir: '/home/user/.local/bin',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe('downloaded');
      expect(result.path).toContain('/home/user/.local/bin');
      expect(result.path).toContain('yt-dlp');
    }
  });

  it('returns BinaryDownloadFailed when fetch throws', async () => {
    const fakeFetch = async (_url: string): Promise<Uint8Array> => {
      throw new Error('Network error');
    };
    const fakeFs = {
      mkdir: async (_path: string) => {},
      writeFile: async (_path: string, _data: Uint8Array) => {},
      chmod: async (_path: string, _mode: number) => {},
    };

    const result = await download({
      platform: 'linux',
      arch: 'x64',
      fetch: fakeFetch,
      fs: fakeFs,
      installDir: '/home/user/.local/bin',
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.tag === 'BinaryDownloadFailed') {
      expect(result.error.reason).toBe('Network error');
    }
  });
});

describe('ensure', () => {
  it('returns system binary when found on PATH', async () => {
    const fakeWhich = (name: string): string | null =>
      name === 'yt-dlp' ? '/usr/bin/yt-dlp' : null;
    const fakeRun = async (_bin: string, _args: string[]) => ({
      success: true,
      stdout: '2024.01.01',
      stderr: '',
    });

    const result = await ensure({ which: fakeWhich, run: fakeRun });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe('/usr/bin/yt-dlp');
      expect(result.source).toBe('system');
    }
  });

  it('downloads binary when not found on PATH', async () => {
    const fakeWhich = (_name: string): string | null => null;
    const binaryData = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
    const fakeFetch = async (_url: string): Promise<Uint8Array> => binaryData;
    const fakeFs = {
      mkdir: async (_path: string) => {},
      writeFile: async (_path: string, _data: Uint8Array) => {},
      chmod: async (_path: string, _mode: number) => {},
    };

    const result = await ensure({
      which: fakeWhich,
      fetch: fakeFetch,
      fs: fakeFs,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe('downloaded');
    }
  });

  it('validates user-provided binary path directly', async () => {
    const fakeRun = async (_bin: string, _args: string[]) => ({
      success: true,
      stdout: '2024.01.01',
      stderr: '',
    });

    const result = await ensure({ binary: '/custom/yt-dlp', run: fakeRun });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe('/custom/yt-dlp');
      expect(result.source).toBe('system');
    }
  });
});
