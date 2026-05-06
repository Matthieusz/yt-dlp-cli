export type YtDlpError =
  | { tag: 'BinaryNotFound'; checked: string[] }
  | { tag: 'BinaryDownloadFailed'; url: string; reason: string }
  | { tag: 'BinaryInstallFailed'; path: string; reason: string }
  | { tag: 'FetchFailed'; url: string; stderr: string }
  | { tag: 'NoFormats'; url: string }
  | { tag: 'DownloadFailed'; url: string; stderr: string }
  | { tag: 'UserCancelled' };

export const YtDlpError = {
  binaryNotFound: (checked: string[]): YtDlpError => ({
    tag: 'BinaryNotFound',
    checked,
  }),
  binaryDownloadFailed: (url: string, reason: string): YtDlpError => ({
    tag: 'BinaryDownloadFailed',
    url,
    reason,
  }),
  binaryInstallFailed: (path: string, reason: string): YtDlpError => ({
    tag: 'BinaryInstallFailed',
    path,
    reason,
  }),
  fetchFailed: (url: string, stderr: string): YtDlpError => ({
    tag: 'FetchFailed',
    url,
    stderr,
  }),
  noFormats: (url: string): YtDlpError => ({
    tag: 'NoFormats',
    url,
  }),
  downloadFailed: (url: string, stderr: string): YtDlpError => ({
    tag: 'DownloadFailed',
    url,
    stderr,
  }),
  userCancelled: (): YtDlpError => ({
    tag: 'UserCancelled',
  }),
} as const;
