import * as p from '@clack/prompts';
import type { Format, VideoInfo } from '../types.ts';
import type { FormatGroup } from '../yt-dlp/formats.ts';
import {
  buildFormatChoices,
  buildFormatDetailChoices,
  CUSTOM_FORMAT_SENTINEL,
} from '../yt-dlp/formats.ts';

export async function promptForUrl(): Promise<string | null> {
  const url = await p.text({
    message: 'Enter video or playlist URL:',
    placeholder: 'https://youtube.com/watch?v=...',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'URL cannot be empty';
      }
      return;
    },
  });

  return p.isCancel(url) ? null : url;
}

export async function promptForFormat(
  shortcuts: Format[],
  groups: FormatGroup[],
): Promise<string | null> {
  const choices = buildFormatChoices(shortcuts, groups);

  const selected = await p.select<string>({
    message: 'Select format:',
    options: choices,
  });

  if (p.isCancel(selected)) return null;

  if (selected.startsWith(CUSTOM_FORMAT_SENTINEL)) {
    return promptCustomFormat(groups);
  }

  return selected;
}

async function promptCustomFormat(
  groups: FormatGroup[],
): Promise<string | null> {
  const options = buildFormatDetailChoices(groups);

  const selected = await p.select<string>({
    message: 'Select format:',
    options,
  });

  return p.isCancel(selected) ? null : selected;
}

export async function promptForPlaylistVideos(
  entries: VideoInfo[],
): Promise<VideoInfo[] | null> {
  const choices = entries.map((entry, i) => ({
    value: String(i),
    label: `${i + 1}. ${entry.title}`,
    hint: entry.duration
      ? `${Math.floor(entry.duration / 60)}:${String(entry.duration % 60).padStart(2, '0')}`
      : undefined,
  }));

  const mode = await p.select<string>({
    message: `${entries.length} videos in playlist:`,
    options: [
      { value: 'all', label: `Download all (${entries.length} videos)` },
      { value: 'select', label: 'Select specific videos...' },
    ],
  });

  if (p.isCancel(mode)) return null;

  if (mode === 'all') {
    return entries;
  }

  const indices = await p.multiselect<string>({
    message: 'Select videos to download (space to toggle):',
    options: choices,
  });

  if (p.isCancel(indices)) return null;

  return indices.map((i) => entries[parseInt(i)]!);
}
