#!/usr/bin/env node
import { Command } from 'commander';
import { resolveConfig } from './config.js';
import { download } from './downloader.js';
import { transcribe } from './transcriber/index.js';
import { writeOutputs } from './formatter.js';
import { fmt, elapsed, progressBar } from './display.js';

// ── backend validation ─────────────────────────────────────────────────────

function toBackend(v: string | undefined): 'local' | 'openai' | undefined {
  if (v === undefined) return undefined;
  if (v === 'local' || v === 'openai') return v;
  process.stderr.write(`Error: --backend must be "local" or "openai", got "${v}"\n`);
  process.exit(1);
}

// ── cli ────────────────────────────────────────────────────────────────────

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
      backend:      toBackend(opts.backend),
      outputDir:    opts.output,
      openaiApiKey: opts.apiKey,
    });

    // ── stage 1: download ──────────────────────────────────────────────────
    process.stderr.write('Downloading...\r');
    const t0 = Date.now();
    const { audioPath, title, durationSec, cleanup } = download(url);
    const downloadMs = Date.now() - t0;
    process.stderr.write(`✓ Download        ${elapsed(downloadMs)}\n`);

    // ── stage 2: transcribe ────────────────────────────────────────────────
    try {
      const t1 = Date.now();

      process.stderr.write('Transcribing...\r');

      const onProgress = (currentSec: number) => {
        process.stderr.write(`\rTranscribing  ${progressBar(currentSec, durationSec)}   `);
      };

      const segments = await transcribe(audioPath, config, onProgress);

      const transcribeMs = Date.now() - t1;
      // clear progress line, print summary
      process.stderr.write(`\r✓ Transcription   ${elapsed(transcribeMs)}\n`);

      // ── write output ───────────────────────────────────────────────────
      const { txtPath, srtPath } = writeOutputs(segments, config.outputDir, title);
      process.stderr.write('\n');
      console.log(txtPath);
      console.log(srtPath);
    } finally {
      cleanup();
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
