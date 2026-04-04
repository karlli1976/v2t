import * as fs from 'fs';
import * as path from 'path';
import type { Segment } from './types.js';

function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

function pad3(n: number): string {
  return String(Math.round(n)).padStart(3, '0');
}

function toSrtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

export function writeOutputs(segments: Segment[], outputDir: string, baseName: string): void {
  fs.mkdirSync(outputDir, { recursive: true });

  const txt = segments.map(s => s.text.trim()).join('\n');
  fs.writeFileSync(path.join(outputDir, `${baseName}.txt`), txt, 'utf-8');

  const srt = segments.length === 0
    ? ''
    : segments
        .map((s, i) =>
          `${i + 1}\n${toSrtTimestamp(s.start)} --> ${toSrtTimestamp(s.end)}\n${s.text.trim()}`
        )
        .join('\n\n');
  fs.writeFileSync(path.join(outputDir, `${baseName}.srt`), srt, 'utf-8');
}
