import { mkdir, chmod } from 'node:fs/promises';
import type { YtDlpError } from '../errors.ts';

export type BinaryResult =
  | { ok: true; path: string; source: 'system' | 'downloaded' }
  | { ok: false; error: YtDlpError };

type Which = (name: string) => string | null;

type LocateOpts = { which?: Which };

export async function locate(opts?: LocateOpts): Promise<BinaryResult> {
  const which = opts?.which ?? defaultWhich;

  const found = which('yt-dlp');
  if (found) {
    return { ok: true, path: found, source: 'system' };
  }

  return { ok: false, error: { tag: 'BinaryNotFound', checked: ['PATH'] } };
}

type CmdResult = {
  success: boolean;
  stdout: string;
  stderr: string;
};

type RunCmd = (bin: string, args: string[]) => Promise<CmdResult>;

type ValidateOpts = { run?: RunCmd };

export async function validate(
  path: string,
  opts?: ValidateOpts,
): Promise<BinaryResult> {
  const run = opts?.run ?? defaultRun;
  const result = await run(path, ['--version']);

  if (result.success) {
    return { ok: true, path, source: 'system' };
  }

  return {
    ok: false,
    error: { tag: 'BinaryNotFound', checked: [path] },
  };
}

async function defaultRun(bin: string, args: string[]): Promise<CmdResult> {
  const proc = Bun.spawn([bin, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { success: exitCode === 0, stdout, stderr };
}

type FileSystem = {
  mkdir: (path: string) => Promise<void>;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  chmod: (path: string, mode: number) => Promise<void>;
};

type DownloadOpts = {
  platform?: string;
  arch?: string;
  fetch?: (url: string) => Promise<Uint8Array>;
  fs?: FileSystem;
  installDir?: string;
};

type EnsureOpts = LocateOpts & ValidateOpts & DownloadOpts & {
  binary?: string;
};

export async function ensure(opts?: EnsureOpts): Promise<BinaryResult> {
  if (opts?.binary) {
    return validate(opts.binary, { run: opts?.run });
  }

  const located = await locate({ which: opts?.which });
  if (located.ok) {
    const validated = await validate(located.path, { run: opts?.run });
    if (validated.ok) {
      return validated;
    }
  }

  return download({
    platform: opts?.platform,
    arch: opts?.arch,
    fetch: opts?.fetch,
    fs: opts?.fs,
    installDir: opts?.installDir,
  });
}

export async function download(opts?: DownloadOpts): Promise<BinaryResult> {
  const platform = opts?.platform ?? process.platform;
  const arch = opts?.arch ?? process.arch;
  const installDir = opts?.installDir ?? defaultInstallDir(platform);
  const fetch = opts?.fetch ?? defaultFetch;
  const fs = opts?.fs ?? defaultFs;

  const asset = getReleaseAsset(platform, arch);
  const url = getReleaseUrl(asset);

  try {
    const data = await fetch(url);
    const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const destPath = `${installDir}/${binaryName}`;

    await fs.mkdir(installDir);
    await fs.writeFile(destPath, data);

    if (platform !== 'win32') {
      await fs.chmod(destPath, 0o755);
    }

    return { ok: true, path: destPath, source: 'downloaded' };
  } catch (err) {
    return {
      ok: false,
      error: {
        tag: 'BinaryDownloadFailed',
        url,
        reason: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function getReleaseAsset(platform: string, arch: string): string {
  if (platform === 'win32') {
    if (arch === 'arm64') return 'yt-dlp_win_aarch64.exe';
    return 'yt-dlp.exe';
  }
  if (platform === 'darwin') return 'yt-dlp_macos';
  if (arch === 'arm64' || arch === 'aarch64') return 'yt-dlp_linux_aarch64';
  return 'yt-dlp_linux';
}

function getReleaseUrl(asset: string): string {
  return `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
}

function defaultInstallDir(platform: string): string {
  if (platform === 'win32') {
    return `${process.env.LOCALAPPDATA ?? process.env.USERPROFILE ?? '.'}\\yt-dlp`;
  }
  return `${process.env.HOME ?? '/tmp'}/.local/bin`;
}

async function defaultFetch(url: string): Promise<Uint8Array> {
  const response = await globalThis.fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

const defaultFs: FileSystem = {
  mkdir: async (path: string) => {
    await mkdir(path, { recursive: true });
  },
  writeFile: async (path: string, data: Uint8Array) => {
    await Bun.write(path, data);
  },
  chmod: async (path: string, mode: number) => {
    await chmod(path, `0o${mode.toString(8)}`);
  },
};

function defaultWhich(name: string): string | null {
  return Bun.which(name);
}
