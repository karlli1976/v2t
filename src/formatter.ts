import * as fs from 'fs';
import * as path from 'path';
import type { Segment } from './types.js';

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function toSrtTimestamp(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
}

export function writeOutputs(segments: Segment[], outputDir: string, baseName: string): { txtPath: string; srtPath: string } {
  fs.mkdirSync(outputDir, { recursive: true });

  const txtPath = path.join(outputDir, `${baseName}.txt`);
  const srtPath = path.join(outputDir, `${baseName}.srt`);

  const txt = segments.map(s => s.text.trim()).join('\n');
  fs.writeFileSync(txtPath, txt, 'utf-8');

  const srt = segments.length === 0
    ? ''
    : segments
        .map((s, i) =>
          `${i + 1}\n${toSrtTimestamp(s.start)} --> ${toSrtTimestamp(s.end)}\n${s.text.trim()}`
        )
        .join('\n\n') + '\n\n';
  fs.writeFileSync(srtPath, srt, 'utf-8');

  return { txtPath, srtPath };
}
