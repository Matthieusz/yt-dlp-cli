#!/usr/bin/env bun
import { ensure } from './yt-dlp/binary.ts';
import { fetchInfo } from './yt-dlp/info.ts';
import { groupFormats, findFormat, describeFormat } from './yt-dlp/formats.ts';
import { resolveFormat } from './yt-dlp/selection.ts';
import { downloadVideo } from './yt-dlp/download.ts';
import { runBatch } from './yt-dlp/batch.ts';
import {
  formatSingleProgress,
  formatBatchProgress,
  formatBatchSummary,
} from './cli/render.ts';
import { parseArgs } from './cli/args.ts';
import { promptForUrl, promptForFormat, promptForPlaylistVideos } from './cli/prompts.ts';
import * as p from '@clack/prompts';
import logUpdate from 'log-update';
import { green, red, yellow, dim, bold, cyan } from 'yoctocolors';
import type { YtDlpError } from './errors.ts';
import type { VideoInfo, Format } from './types.ts';

function formatDescription(formatId: string, formats: Format[]): string {
  if (formatId === 'bestvideo+bestaudio/best') {
    return 'Best quality (video + audio)';
  }
  if (formatId === 'bestaudio/best') {
    return 'Best audio';
  }
  const found = findFormat(formats, formatId);
  return found ? describeFormat(found) : formatId;
}

function errorMessage(err: YtDlpError): string {
  switch (err.tag) {
    case 'BinaryNotFound': return `yt-dlp not found in: ${err.checked.join(', ')}`;
    case 'BinaryDownloadFailed': return `Download failed: ${err.reason} (${err.url})`;
    case 'BinaryInstallFailed': return `Install failed: ${err.reason} at ${err.path}`;
    case 'FetchFailed': return `Fetch failed: ${err.stderr} (${err.url})`;
    case 'NoFormats': return `No formats available for ${err.url}`;
    case 'DownloadFailed': return `Download failed: ${err.stderr} (${err.url})`;
    case 'UserCancelled': return 'Operation cancelled';
  }
}

async function main() {
  const args = parseArgs(process.argv);

  const s1 = p.spinner();
  s1.start('Checking yt-dlp...');
  const binary = await ensure({ binary: args.binary });
  if (!binary.ok) {
    s1.stop(red('✗ Failed'));
    console.error(`\n${red('Error:')} ${errorMessage(binary.error)}`);
    process.exit(1);
  }
  s1.stop(green(`✓ Ready (${binary.source})`));

  let url = args.url;
  if (!url) {
    const prompted = await promptForUrl();
    if (!prompted) {
      console.log(dim('Cancelled.'));
      return;
    }
    url = prompted;
  }

  const s2 = p.spinner();
  s2.start(`Fetching metadata for ${url}...`);
  const info = await fetchInfo(url, { binary: binary.path });
  if (!info.ok) {
    s2.stop(red('✗ Failed'));
    console.error(`\n${red('Error:')} ${errorMessage(info.error)}`);
    process.exit(1);
  }
  s2.stop(green('✓ Done'));

  console.log(`\n${bold(info.value.title)}`);
  if (info.value.duration) {
    const mins = Math.floor(info.value.duration / 60);
    const secs = info.value.duration % 60;
    console.log(dim(`${mins}:${String(secs).padStart(2, '0')} — ${info.value.type}`));
  }

  let entries: VideoInfo[] = [info.value];

  if (info.value.type === 'playlist' && info.value.entries) {
    const selected = await promptForPlaylistVideos(info.value.entries);
    if (!selected) {
      console.log(dim('Cancelled.'));
      return;
    }
    entries = selected;
    console.log(`\n${bold(String(entries.length))} videos selected`);
  }

  const firstEntry = entries[0];
  if (!firstEntry || firstEntry.formats.length === 0) {
    console.error(`${red('Error:')} No formats available`);
    process.exit(1);
  }

  let formatId: string | null = null;

  if (args.best || args.audioOnly || args.format) {
    const result = resolveFormat(firstEntry.formats, {
      best: args.best,
      audioOnly: args.audioOnly,
      format: args.format,
    });
    if (!result.ok) {
      console.error(`\n${red('Error:')} ${errorMessage(result.error)}`);
      process.exit(1);
    }
    formatId = result.formatId;
    const formatLabel = formatDescription(formatId, firstEntry.formats);
    console.log(`Format: ${cyan(formatLabel)} (auto-selected)`);
  } else {
    const { shortcuts, groups } = groupFormats(firstEntry.formats);
    const selected = await promptForFormat(shortcuts, groups);
    if (!selected) {
      console.log(dim('Cancelled.'));
      return;
    }
    formatId = selected;
  }

  const formatDesc = formatDescription(formatId, firstEntry.formats);
  console.log(
    `\n${bold('Downloading:')} ${cyan(formatDesc)} → ${dim(args.outputDir)}/\n`,
  );

  const isBatch = entries.length > 1;

  const batchResult = await runBatch({
    download: (entryUrl, onProgress) =>
      downloadVideo({
        binary: binary.path,
        formatId,
        outDir: args.outputDir,
        outTemplate: args.outputTemplate,
        url: entryUrl,
        onProgress,
      }),
    entries: entries.map((e) => ({
      url:
        entries.length === 1 && info.value.type === 'video'
          ? url
          : `https://www.youtube.com/watch?v=${e.id}`,
      title: e.title,
    })),
    onProgress: isBatch
      ? (entry, current, total, progress) => {
          logUpdate(formatBatchProgress(current, total, entry.title, progress));
        }
      : (_entry, _current, _total, progress) => {
          logUpdate(formatSingleProgress(progress));
        },
    onItemComplete: (_entry, _current, _total, result) => {
      logUpdate.done();
      switch (result.tag) {
        case 'downloaded':
          console.log(`  ${green('✓ Downloaded')}  ${result.path}`);
          break;
        case 'skipped':
          console.log(`  ${yellow('— Skipped')}    ${result.path} (already exists)`);
          break;
        case 'resumed':
          console.log(
            `  ${green('↻ Resumed')}    ${result.path} (from ${result.percent}%)`,
          );
          break;
        case 'failed':
          console.log(`  ${red('✗ Failed')}    ${errorMessage(result.error)}`);
          break;
      }
    },
  });

  if (isBatch) {
    console.log(`\n${formatBatchSummary(batchResult)}`);
  }
}

main();
