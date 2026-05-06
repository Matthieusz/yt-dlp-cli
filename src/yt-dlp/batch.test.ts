import { describe, it, expect } from 'bun:test';
import { runBatch } from './batch.ts';
import type { DownloadProgress, DownloadResult } from './download.ts';

const fakeProgress: DownloadProgress = {
  percent: 50,
  totalSize: '10MiB',
  speed: '1MiB/s',
  eta: '00:10',
};

function downloaded(path: string): DownloadResult {
  return { tag: 'downloaded', path };
}

function skipped(path: string): DownloadResult {
  return { tag: 'skipped', path };
}

function resumed(path: string, percent: number): DownloadResult {
  return { tag: 'resumed', path, percent };
}

function failed(url: string, stderr: string): DownloadResult {
  return { tag: 'failed', error: { tag: 'DownloadFailed', url, stderr } };
}

describe('runBatch', () => {
  it('returns empty result for empty entries', async () => {
    const result = await runBatch({
      download: async () => downloaded('/tmp/v.mp4'),
      entries: [],
    });

    expect(result.downloaded).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('counts downloaded items', async () => {
    const result = await runBatch({
      download: async () => downloaded('/tmp/v.mp4'),
      entries: [
        { url: 'a', title: 'A' },
        { url: 'b', title: 'B' },
      ],
    });

    expect(result.downloaded).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('continues after individual failure and calls all entries', async () => {
    const calls: string[] = [];

    const result = await runBatch({
      download: async (url) => {
        calls.push(url);
        if (url === 'fail') return failed(url, 'boom');
        return downloaded(url);
      },
      entries: [
        { url: 'ok1', title: 'OK 1' },
        { url: 'fail', title: 'Fail' },
        { url: 'ok2', title: 'OK 2' },
      ],
    });

    expect(calls).toEqual(['ok1', 'fail', 'ok2']);
    expect(result.downloaded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('counts skipped items', async () => {
    const result = await runBatch({
      download: async () => skipped('/tmp/exists.mp4'),
      entries: [{ url: 'a', title: 'A' }],
    });

    expect(result.skipped).toBe(1);
    expect(result.downloaded).toBe(0);
  });

  it('counts resumed as downloaded', async () => {
    const result = await runBatch({
      download: async () => resumed('/tmp/v.mp4', 45),
      entries: [{ url: 'a', title: 'A' }],
    });

    expect(result.downloaded).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('reports progress with correct batch position', async () => {
    const calls: { current: number; total: number; title: string }[] = [];

    await runBatch({
      download: async (_url, onProgress) => {
        onProgress?.(fakeProgress);
        return downloaded('/tmp/v.mp4');
      },
      entries: [
        { url: 'a', title: 'First' },
        { url: 'b', title: 'Second' },
        { url: 'c', title: 'Third' },
      ],
      onProgress: (entry, current, total) => {
        calls.push({ current, total, title: entry.title });
      },
    });

    expect(calls).toEqual([
      { current: 1, total: 3, title: 'First' },
      { current: 2, total: 3, title: 'Second' },
      { current: 3, total: 3, title: 'Third' },
    ]);
  });

  it('reports item completion with result', async () => {
    const completed: { title: string; tag: string }[] = [];

    await runBatch({
      download: async (url) =>
        url === 'skip'
          ? skipped('/tmp/skip.mp4')
          : downloaded('/tmp/ok.mp4'),
      entries: [
        { url: 'ok', title: 'Good' },
        { url: 'skip', title: 'SkipMe' },
      ],
      onItemComplete: (entry, _current, _total, result) => {
        completed.push({ title: entry.title, tag: result.tag });
      },
    });

    expect(completed).toEqual([
      { title: 'Good', tag: 'downloaded' },
      { title: 'SkipMe', tag: 'skipped' },
    ]);
  });

  it('includes per-item context in result items', async () => {
    const result = await runBatch({
      download: async (url) => downloaded(`/tmp/${url}.mp4`),
      entries: [{ url: 'abc', title: 'ABC Video' }],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.entry).toEqual({ url: 'abc', title: 'ABC Video' });
    expect(result.items[0]!.result.tag).toBe('downloaded');
  });

  it('handles all-failure batch', async () => {
    const result = await runBatch({
      download: async (url) => failed(url, 'err'),
      entries: [
        { url: 'a', title: 'A' },
        { url: 'b', title: 'B' },
      ],
    });

    expect(result.failed).toBe(2);
    expect(result.downloaded).toBe(0);
  });
});
