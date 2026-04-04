import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Segment } from '../types.js';

function checkWhisper(): void {
  const result = spawnSync('whisper', ['--help'], { encoding: 'utf-8' });
  if (result.error || result.status !== 0) {
    throw new Error(
      'whisper not found on PATH.\n' +
      'Install it: pip install openai-whisper\n' +
      'Requires ffmpeg: https://ffmpeg.org/download.html'
    );
  }
}

export function transcribeLocal(
  audioPath: string,
  language: string,
  model: string
): Segment[] {
  checkWhisper();

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v2t-whisper-'));
  try {
    execFileSync(
      'whisper',
      [
        audioPath,
        '--model', model,
        '--language', language,
        '--task', 'transcribe',
        '--output_dir', outDir,
        '--output_format', 'json',
      ],
      { stdio: ['ignore', 'inherit', 'inherit'] }
    );

    const baseName = path.basename(audioPath, path.extname(audioPath));
    const jsonPath = path.join(outDir, `${baseName}.json`);
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as {
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    return (raw.segments ?? []).map(s => ({ start: s.start, end: s.end, text: s.text }));
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}
