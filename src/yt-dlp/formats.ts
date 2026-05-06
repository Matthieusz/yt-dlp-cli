import type { Format } from '../types.ts';

export type FormatGroup = {
  resolution: string;
  formats: Format[];
};

export type FormatPickResult = {
  shortcuts: Format[];
  groups: FormatGroup[];
};

export function findFormat(formats: Format[], id: string): Format | undefined {
  return formats.find((f) => f.id === id);
}

export function describeFormat(format: Format): string {
  const size = format.filesize
    ? ` (${(format.filesize / 1024 / 1024).toFixed(1)} MB)`
    : '';
  const codecs = [format.vcodec, format.acodec]
    .filter((c) => c !== 'none')
    .join('+');
  return `${format.resolution} ${codecs}${size}`;
}

export function groupFormats(formats: Format[]): FormatPickResult {
  if (formats.length === 0) {
    return { shortcuts: [], groups: [] };
  }

  const { audio, video } = splitFormats(formats);

  const shortcuts: Format[] = [];

  const bestAudio = pickBestAudio(audio);
  if (bestAudio) shortcuts.push(bestAudio);

  const groups = groupVideoFormats(video);

  const bestVideo = pickBestVideo(video);
  if (bestVideo) shortcuts.unshift(bestVideo);

  return { shortcuts, groups };
}

function splitFormats(formats: Format[]): {
  audio: Format[];
  video: Format[];
} {
  return formats.reduce(
    (acc, f) => {
      if (f.vcodec === 'none' && f.acodec !== 'none') {
        acc.audio.push(f);
      } else {
        acc.video.push(f);
      }
      return acc;
    },
    { audio: [] as Format[], video: [] as Format[] },
  );
}

function pickBestAudio(formats: Format[]): Format | undefined {
  if (formats.length === 0) return undefined;
  return formats.reduce((best, f) =>
    (f.filesize ?? 0) > (best.filesize ?? 0) ? f : best,
  );
}

function pickBestVideo(formats: Format[]): Format | undefined {
  if (formats.length === 0) return undefined;
  return formats.reduce((best, f) => {
    const bestPixels = parsePixelCount(best.resolution);
    const fPixels = parsePixelCount(f.resolution);
    if (fPixels > bestPixels) return f;
    if (fPixels === bestPixels && (f.filesize ?? 0) > (best.filesize ?? 0)) return f;
    return best;
  });
}

function parsePixelCount(resolution: string): number {
  const match = resolution.match(/^(\d+)x(\d+)$/);
  if (!match?.[1] || !match?.[2]) return 0;
  return parseInt(match[1]) * parseInt(match[2]);
}

function groupVideoFormats(formats: Format[]): FormatGroup[] {
  const byResolution = new Map<string, Format[]>();

  for (const f of formats) {
    const existing = byResolution.get(f.resolution);
    if (existing) {
      existing.push(f);
    } else {
      byResolution.set(f.resolution, [f]);
    }
  }

  return [...byResolution.entries()]
    .sort(([a], [b]) => parsePixelCount(b) - parsePixelCount(a))
    .map(([resolution, fmts]) => ({ resolution, formats: fmts }));
}
