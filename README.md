# yt-dlp-cli

An interactive CLI wrapper for [yt-dlp](https://github.com/yt-dlp/yt-dlp) — download videos and playlists through a guided terminal interface.

## Features

- **Auto-manages the yt-dlp binary**. Detects an existing install on PATH, or downloads the standalone executable to `~/.local/bin/yt-dlp` (Unix) / `%LOCALAPPDATA%\yt-dlp\yt-dlp.exe` (Windows).
- **Interactive format selection** with shortcuts: Best quality, Best audio only, or browse all formats grouped by resolution.
- **Playlist support**: preview the video list, pick a subset, apply one format to all.
- **Inline progress**: per-file percentage, speed, ETA, and title. Batch mode shows position through the queue.
- **Resilient batch**: individual failures are logged but don't abort the rest of the job. A summary is printed at the end.
- **CLI flags for automation**: skip the prompts with `--best`, `--audio-only`, or `--format`.

## Requirements

- [Bun](https://bun.com) runtime

## Install

```bash
bun install
```

## Usage

```bash
# Interactive mode — enter URL when prompted
bun run src/main.ts

# Pass a URL directly
bun run src/main.ts https://www.youtube.com/watch?v=...

# Skip selection, pick best quality
bun run src/main.ts --best https://www.youtube.com/watch?v=...

# Audio only
bun run src/main.ts --audio-only https://www.youtube.com/watch?v=...

# Custom output directory and filename template
bun run src/main.ts -o ~/Videos -t "%(title)s.%(ext)s" https://...
```

### CLI Reference

```
Usage: yt-dlp-cli [options] [url]

Arguments:
  url                    Video or playlist URL

Options:
  -f, --format <id>      Use a specific yt-dlp format ID
  -o, --output <dir>     Output directory (default: ./downloads)
  -t, --template <tmpl>  Filename template (default: %(title)s [%(id)s].%(ext)s)
  --audio-only           Only audio formats
  --best                 Auto-pick best quality, no prompt
  --binary <path>        Path to the yt-dlp binary
```

## How It Works

1. **Binary check**: locates `yt-dlp` on PATH; if missing, downloads the latest standalone release from the yt-dlp GitHub.
2. **Metadata fetch**: runs `yt-dlp --dump-single-json` on the given URL to retrieve title, duration, formats, and playlist entries.
3. **Format selection**: presents a picker with shortcuts (best video+audio, best audio) and a custom option to browse all formats grouped by resolution.
4. **Download**: spawns `yt-dlp` with the chosen format. Progress is parsed from stdout and rendered inline.
5. **Batch summary**: after a playlist download, prints counts of downloaded, skipped, resumed, and failed items.

## Project Structure

```
src/
├── main.ts              Entry point
├── types.ts             Domain types (VideoInfo, Format, etc.)
├── errors.ts            Tagged error union
├── cli/
│   ├── args.ts          Flag parsing (commander)
│   ├── prompts.ts       Interactive prompts (@clack/prompts)
│   └── render.ts        Progress bars and summary formatting
└── yt-dlp/
    ├── binary.ts        Locate, validate, download yt-dlp
    ├── info.ts          Fetch video/playlist metadata
    ├── formats.ts       Parse, group, and describe formats
    ├── selection.ts     Resolve CLI-specified format choices
    ├── download.ts      Spawn download and stream progress
    ├── batch.ts         Sequential batch runner with failure isolation
    └── exec.ts          Child-process execution helper
```

## Limitations

- **No authentication**. Only publicly accessible content is supported. No cookies, credentials, or login.
- **Sequential downloads only**. Playlist items are downloaded one at a time.
- **No config file**. All settings are passed as CLI flags.
