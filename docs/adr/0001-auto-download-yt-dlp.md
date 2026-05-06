# ADR 0001: Auto-Download yt-dlp Binary on First Run

## Status

Accepted

## Context

`yt-dlp-cli` wraps the external `yt-dlp` binary to provide an interactive format-selection and download experience. The binary is not bundled with the package.

We considered three strategies for obtaining `yt-dlp`:

1. **Require pre-installed binary** — simplest for us, but creates friction for users who don't have it. Error messages must be clear and helpful.
2. **Bundle the binary** inside the npm package — eliminates runtime discovery, but inflates package size by ~20MB and ties releases to `yt-dlp` releases.
3. **Auto-download on first run** — zero-friction for users, keeps package small, but adds runtime complexity (download URLs, platform detection, PATH management, failure modes).

Additionally, we considered where to place a downloaded binary:

- **Project-local `vendor/` directory** — transparent, no user environment mutation, but the binary is invisible to the user and must be re-downloaded per project.
- **User-local install directory** (`~/.local/bin/`, `%LOCALAPPDATA%\yt-dlp\`) — shared across projects, discoverable, but requires modifying the user's shell RC file or PATH to be usable outside the CLI.

## Decision

We will **auto-download the standalone compiled `yt-dlp` executable on first run** if it is not found on the system PATH.

- Download the appropriate platform binary from the official `yt-dlp` GitHub releases.
- Install to a user-local directory: `~/.local/bin/yt-dlp` (Unix) or `%LOCALAPPDATA%\yt-dlp\yt-dlp.exe` (Windows).
- With explicit user confirmation, append the install directory to the user's shell RC file (`~/.bashrc`, `~/.zshrc`, `~/.config/fish/config.fish`, or PowerShell `$PROFILE`) so the binary is available on PATH for future sessions.
- Always check for a pre-existing system binary first (via `which yt-dlp` / `where yt-dlp`) and prefer it over a downloaded one.

## Consequences

### Positive

- **Zero-friction onboarding**: Users can run the CLI immediately without manually installing `yt-dlp`.
- **Small package size**: The npm package contains only the CLI wrapper (~tens of KB).
- **Shared across projects**: The user-local install means one download serves all invocations of `yt-dlp-cli`.
- **Up-to-date**: Downloads the latest release, avoiding stale bundled binaries.

### Negative

- **Runtime network dependency**: First run requires internet access and GitHub availability.
- **PATH mutation risk**: Modifying shell RC files can fail or conflict with user preferences. We mitigate this with explicit confirmation.
- **Platform complexity**: Windows PATH management differs significantly from Unix (no `.bashrc`, requires registry or PowerShell profile edits).
- **Security surface**: Downloading and executing a binary from GitHub requires checksum verification and HTTPS enforcement.

## Alternatives Considered

- **Bundling**: Rejected because it bloats the package and couples our release cycle to `yt-dlp`'s.
- **Project-local vendor directory**: Rejected because it duplicates the binary per project and hides it from the user.
- **System-wide install with `sudo`**: Rejected because it requires elevated privileges and is too invasive.
