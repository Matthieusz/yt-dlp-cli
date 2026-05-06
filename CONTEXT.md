# Context: yt-dlp-cli

## Glossary

### Binary Management
- **External Binary**: The `yt-dlp` executable is not bundled in the package. The CLI discovers or obtains it at runtime.
- **User-Local Install**: When `yt-dlp` is missing, the CLI downloads it to a user-local directory (`~/.local/bin/yt-dlp` on Unix, `%LOCALAPPDATA%\yt-dlp\yt-dlp.exe` on Windows) and, with explicit user confirmation, appends that directory to the user's shell RC file to add it to PATH.
- **System Binary**: A pre-existing `yt-dlp` found on the system PATH. Preferred over downloading.
- **Standalone Executable**: The compiled, self-contained `yt-dlp` binary (no Python dependency). Downloaded for all supported platforms.

### Domain Concepts
- **Media Job**: A single URL + chosen format + output configuration ready for download.
- **Batch Job**: A playlist URL + subset of selected entries + a single shared format applied to all entries.
- **Format**: A specific audio/video stream combination offered by the host platform. Presented to the user for selection.
- **Playlist Flow**: When a playlist URL is given, the CLI shows the list of videos for subset selection, then asks for one format to apply to all selected videos.
- **Resilient Batch**: During a batch download, individual video failures are logged but do not abort the entire job. A summary report is printed at completion.
- **Inline Progress**: Download progress renders as a single updating line showing batch position (when applicable), percent, speed, ETA, and current title.
- **Output Defaults**: Default output directory is `./downloads/`. Default filename template is `%(title)s [%(id)s].%(ext)s`. Customizable via `--output-dir` and `--output-template` flags. No config file support.
- **Format Selection**: Format picker presents three shortcuts first: `Best quality`, `Best audio only`, and `Custom...`. `Custom...` reveals a grouped-by-resolution list with codec and filesize detail.
- **Sequential Batch**: Playlist videos download one at a time. No concurrent downloads.
- **File Conflict Handling**: Delegated to `yt-dlp` natively (resumes partial downloads, skips completed files). The CLI surfaces the resulting state in the batch summary (e.g., `skipped`, `resumed`, `downloaded`).
- **Universal URLs**: Accepts any URL supported by `yt-dlp`. No site-specific validation or restrictions.
- **No Authentication**: The CLI does not support passing credentials, cookies, or auth tokens. Only publicly accessible content is supported.
