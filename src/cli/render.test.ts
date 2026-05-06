import { describe, it, expect } from 'bun:test';
import {
  formatProgressBar,
  formatBatchProgress,
  formatSingleProgress,
  formatBatchSummary,
} from './render.ts';
import type { DownloadProgress } from '../yt-dlp/download.ts';

const progress: DownloadProgress = {
  percent: 45,
  totalSize: '50.00MiB',
  speed: '3.45MiB/s',
  eta: '00:12',
};

describe('formatProgressBar', () => {
  it('renders a progress bar with percent', () => {
    const bar = formatProgressBar(progress, 10);

    expect(bar).toContain('45%');
    expect(bar).toContain('█');
    expect(bar).toContain('░');
  });

  it('handles 0%', () => {
    const bar = formatProgressBar({ ...progress, percent: 0 }, 10);
    expect(bar).toContain('0%');
  });

  it('handles 100%', () => {
    const bar = formatProgressBar({ ...progress, percent: 100 }, 10);
    expect(bar).toContain('100%');
  });
});

describe('formatSingleProgress', () => {
  it('renders progress with speed and ETA', () => {
    const line = formatSingleProgress(progress);

    expect(line).toContain('45%');
    expect(line).toContain('3.45MiB/s');
    expect(line).toContain('00:12');
  });
});

describe('formatBatchProgress', () => {
  it('includes batch position and title', () => {
    const line = formatBatchProgress(3, 10, 'My Video Title', progress);

    expect(line).toContain('[3/10]');
    expect(line).toContain('My Video Title');
    expect(line).toContain('45%');
    expect(line).toContain('3.45MiB/s');
    expect(line).toContain('00:12');
  });
});

describe('formatBatchSummary', () => {
  it('renders summary with all counts', () => {
    const summary = formatBatchSummary({ downloaded: 5, skipped: 2, failed: 1 });

    expect(summary).toContain('5');
    expect(summary).toContain('2');
    expect(summary).toContain('1');
    expect(summary).toContain('Downloaded');
    expect(summary).toContain('Skipped');
    expect(summary).toContain('Failed');
  });

  it('handles zero counts', () => {
    const summary = formatBatchSummary({ downloaded: 0, skipped: 0, failed: 0 });
    expect(summary).toContain('0');
  });
});
