#!/usr/bin/env node
import { Command } from 'commander';
import { resolveConfig } from './config.js';
import { download } from './downloader.js';
import { transcribe } from './transcriber/index.js';
import { writeOutputs } from './formatter.js';

const program = new Command();

program
  .name('v2t')
  .description('Extract transcript from video URL')
  .argument('<url>', 'Video URL (YouTube, x.com, or any yt-dlp-supported site)')
  .option('-l, --language <code>', 'Language code (e.g. zh, en, ja)')
  .option('-m, --model <name>', 'Whisper model (e.g. turbo, base, small, medium, large)')
  .option('-b, --backend <name>', 'Transcription backend: local or openai')
  .option('-o, --output <dir>', 'Output directory')
  .option('--api-key <key>', 'OpenAI API key (for --backend openai)')
  .action(async (url: string, opts: {
    language?: string;
    model?: string;
    backend?: string;
    output?: string;
    apiKey?: string;
  }) => {
    const config = resolveConfig({
      language:     opts.language,
      model:        opts.model,
      backend:      opts.backend as 'local' | 'openai' | undefined,
      outputDir:    opts.output,
      openaiApiKey: opts.apiKey,
    });

    if (opts.backend !== undefined && opts.backend !== 'local' && opts.backend !== 'openai') {
      process.stderr.write(`Error: --backend must be "local" or "openai", got "${opts.backend}"\n`);
      process.exit(1);
    }

    process.stderr.write(`Downloading: ${url}\n`);
    const { audioPath, title, cleanup } = download(url);

    try {
      process.stderr.write(`Transcribing with backend: ${config.backend}\n`);
      const segments = await transcribe(audioPath, config);

      const { txtPath, srtPath } = writeOutputs(segments, config.outputDir, title);
      process.stderr.write('Done.\n');
      console.log(txtPath);
      console.log(srtPath);
    } finally {
      cleanup();
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
