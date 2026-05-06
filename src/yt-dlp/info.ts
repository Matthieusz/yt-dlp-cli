import type { VideoInfo, Format, MediaType } from '../types.ts';
import { type YtDlpError, YtDlpError as err } from '../errors.ts';

export type InfoResult =
  | { ok: true; value: VideoInfo }
  | { ok: false; error: YtDlpError };

type RunCmd = (bin: string, args: string[]) => Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
}>;

type FetchInfoOpts = {
  binary?: string;
  run?: RunCmd;
};

export async function fetchInfo(
  url: string,
  opts?: FetchInfoOpts,
): Promise<InfoResult> {
  const binary = opts?.binary ?? 'yt-dlp';
  const run = opts?.run ?? defaultRun;
  const args = ['--dump-json', '--no-download', url];

  const result = await run(binary, args);

  if (!result.success) {
    return {
      ok: false,
      error: err.fetchFailed(url, result.stderr),
    };
  }

  try {
    const raw = JSON.parse(result.stdout);
    return { ok: true, value: parseVideoInfo(raw) };
  } catch {
    return {
      ok: false,
      error: err.fetchFailed(url, 'Failed to parse JSON output'),
    };
  }
}

type RawYtDlpFormat = {
  format_id: string;
  ext: string;
  resolution: string | null;
  fps: number | null;
  filesize: number | null;
  vcodec: string | null;
  acodec: string | null;
};

type RawYtDlpVideo = {
  id: string;
  title: string;
  duration?: number;
  thumbnail?: string;
  formats?: RawYtDlpFormat[];
  _type?: string;
  entries?: RawYtDlpVideo[];
};

function parseVideoInfo(raw: RawYtDlpVideo): VideoInfo {
  const type: MediaType = raw._type === 'playlist' ? 'playlist' : 'video';

  const formats: Format[] = (raw.formats ?? []).map((f) => ({
    id: f.format_id,
    ext: f.ext,
    resolution: f.resolution ?? '?',
    fps: f.fps ?? undefined,
    filesize: f.filesize ?? undefined,
    vcodec: f.vcodec ?? '?',
    acodec: f.acodec ?? '?',
  }));

  return {
    id: raw.id,
    title: raw.title,
    type,
    formats,
    thumbnail: raw.thumbnail,
    duration: raw.duration,
    entries: raw.entries?.map(parseVideoInfo),
  };
}

async function defaultRun(
  bin: string,
  args: string[],
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const proc = Bun.spawn([bin, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { success: exitCode === 0, stdout, stderr };
}
