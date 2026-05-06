import { Command } from 'commander';

export type CliArgs = {
  url?: string;
  format?: string;
  outputDir: string;
  outputTemplate: string;
  audioOnly: boolean;
  best: boolean;
  binary?: string;
};

export function parseArgs(args: string[]): CliArgs {
  const program = new Command();

  program
    .name('yt-dlp-cli')
    .description('Interactive yt-dlp downloader')
    .argument('[url]', 'Video or playlist URL')
    .option('-f, --format <id>', 'Skip selection, use format ID directly')
    .option('-o, --output <dir>', 'Output directory', './downloads')
    .option('-t, --template <tmpl>', 'Filename template', '%(title)s [%(id)s].%(ext)s')
    .option('--audio-only', 'Only show audio formats', false)
    .option('--best', 'Auto-pick best quality, no prompt', false)
    .option('--binary <path>', 'Path to yt-dlp binary')
    .parse(args);

  const opts = program.opts<{
    format?: string;
    output: string;
    template: string;
    audioOnly: boolean;
    best: boolean;
    binary?: string;
  }>();

  return {
    url: program.args[0],
    format: opts.format,
    outputDir: opts.output,
    outputTemplate: opts.template,
    audioOnly: opts.audioOnly,
    best: opts.best,
    binary: opts.binary,
  };
}
