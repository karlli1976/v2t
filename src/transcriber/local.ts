import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Segment } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The Python helper lives next to this file in both src/ and dist/
const FASTER_WHISPER_SCRIPT = path.join(__dirname, 'faster_whisper_run.py');

const LOG_PATH = path.join(process.cwd(), 'log', '.v2t-debug.log');

function log(msg: string): void {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, msg, 'utf-8');
}

function hasFasterWhisper(): boolean {
  if (!fs.existsSync(FASTER_WHISPER_SCRIPT)) return false;
  const result = spawnSync('python', ['-c', 'import faster_whisper'], { encoding: 'utf-8' });
  return !result.error && result.status === 0;
}

function checkWhisper(): void {
  const result = spawnSync('whisper', ['--help'], { encoding: 'utf-8' });
  if (result.error) {
    throw new Error(
      'whisper not found on PATH.\n' +
      'Install it: pip install openai-whisper\n' +
      'Requires ffmpeg: https://ffmpeg.org/download.html'
    );
  }
}

// Parses whisper's MM:SS.mmm or HH:MM:SS.mmm timestamp format to seconds.
function parseWhisperTs(ts: string): number {
  const parts = ts.split(':');
  if (parts.length === 3) {
    return  Number.parseInt(parts[0], 10) * 3600 +  Number.parseInt(parts[1], 10) * 60 + Number.parseFloat(parts[2]);
  }
  return  Number.parseInt(parts[0], 10) * 60 +  Number.parseFloat(parts[1]);
}

// Parses a whisper output line like: [00:00.000 --> 00:03.500]  Some text
function parseLine(line: string): Segment | null {
  const m = /\[([\d:.]+)\s*-->\s*([\d:.]+)]\s*(.*)/.exec(line);
  if (!m) return null;
  const text = m[3].trim();
  if (!text) return null;
  return { start: parseWhisperTs(m[1]), end: parseWhisperTs(m[2]), text };
}

function runTranscriber(
  cmd: string,
  args: string[],
  onProgress?: (currentSec: number) => void
): Promise<Segment[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      cmd, args,
      { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } }
    );

    const segments: Segment[] = [];

    function processChunk(buf: string[], chunk: Buffer, label: string): void {
      const str = chunk.toString();
      log(`[${label}] ${str}`);
      buf.push(str);
      const joined = buf.join('');
      const lines = joined.split('\n');
      buf.length = 0;
      buf.push(lines.pop() ?? '');
      for (const line of lines) {
        const seg = parseLine(line);
        if (seg) {
          segments.push(seg);
          onProgress?.(seg.end);
        }
      }
    }

    const stdoutBuf: string[] = [];
    const stderrBuf: string[] = [];
    proc.stdout.on('data', (chunk: Buffer) => processChunk(stdoutBuf, chunk, 'stdout'));
    proc.stderr.on('data', (chunk: Buffer) => processChunk(stderrBuf, chunk, 'stderr'));

    proc.on('close', (code) => {
      for (const line of [...stdoutBuf, ...stderrBuf]) {
        const seg = parseLine(line);
        if (seg) { segments.push(seg); onProgress?.(seg.end); }
      }
      log(`[close] code=${code} segments=${segments.length}\n`);
      if (code !== 0) {
        reject(new Error(`${cmd} exited with code ${code}`));
        return;
      }
      resolve(segments);
    });

    proc.on('error', reject);
  });
}

export function transcribeLocal(
  audioPath: string,
  language: string,
  model: string,
  onProgress?: (currentSec: number) => void
): Promise<Segment[]> {
  const outDir = path.dirname(audioPath);
  const runId = new Date().toISOString();

  // Prefer faster-whisper if available — typically 4-8x faster on CPU
  if (hasFasterWhisper()) {
    log(`\n${'='.repeat(60)}\n[${runId}] backend=faster-whisper audioPath=${audioPath} model=${model} lang=${language}\n`);
    return runTranscriber('python', [
      FASTER_WHISPER_SCRIPT,
      audioPath,
      '--model', model,
      '--language', language,
      '--beam_size', '1',
      '--temperature', '0',
      '--condition_on_previous_text', 'False',
    ], onProgress);
  }

  checkWhisper();
  log(`\n${'='.repeat(60)}\n[${runId}] backend=whisper audioPath=${audioPath} model=${model} lang=${language}\n`);
  return runTranscriber('whisper', [
    audioPath,
    '--model', model,
    '--language', language,
    '--task', 'transcribe',
    '--output_dir', outDir,
    '--output_format', 'txt',
    '--beam_size', '1',
    '--best_of', '1',
    '--temperature', '0',
    '--condition_on_previous_text', 'False',
  ], onProgress);
}
