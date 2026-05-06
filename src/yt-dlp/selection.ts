import type { Format } from '../types.ts';
import { type YtDlpError, YtDlpError as err } from '../errors.ts';

export type SelectResult =
  | { ok: true; formatId: string }
  | { ok: false; error: YtDlpError };

export type SelectOpts = {
  best?: boolean;
  audioOnly?: boolean;
  format?: string;
};

export function resolveFormat(
  formats: Format[],
  opts: SelectOpts,
): SelectResult {
  if (opts.format) {
    return { ok: true, formatId: opts.format };
  }

  if (formats.length === 0) {
    return { ok: false, error: err.noFormats('(no formats provided)') };
  }

  if (opts.audioOnly) {
    return { ok: true, formatId: 'bestaudio/best' };
  }

  if (opts.best) {
    return { ok: true, formatId: 'bestvideo+bestaudio/best' };
  }

  // No flags set — caller should use interactive selection
  const fallback = formats[0];
  if (!fallback) {
    return { ok: false, error: err.noFormats('(no formats)') };
  }
  return { ok: true, formatId: fallback.id };
}
