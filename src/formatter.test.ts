import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { writeOutputs } from './formatter.js';
import type { Segment } from './types.js';

function withTmpDir(fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v2t-test-'));
  try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

describe('writeOutputs', () => {
  it('writes .txt with one line per segment, no timestamps', () => {
    withTmpDir(dir => {
      const segments: Segment[] = [
        { start: 0, end: 2.5, text: ' Hello world ' },
        { start: 2.5, end: 5.0, text: ' How are you ' },
      ];
      writeOutputs(segments, dir, 'test');
      const txt = fs.readFileSync(path.join(dir, 'test.txt'), 'utf-8');
      expect(txt).toBe('Hello world\nHow are you');
    });
  });

  it('writes .srt with correct SRT block format', () => {
    withTmpDir(dir => {
      const segments: Segment[] = [
        { start: 0, end: 2.5, text: 'Hello world' },
        { start: 2.5, end: 65.123, text: 'Second line' },
      ];
      writeOutputs(segments, dir, 'test');
      const srt = fs.readFileSync(path.join(dir, 'test.srt'), 'utf-8');
      expect(srt).toContain('1\n00:00:00,000 --> 00:00:02,500\nHello world');
      expect(srt).toContain('2\n00:00:02,500 --> 00:01:05,123\nSecond line');
    });
  });

  it('creates output directory if it does not exist', () => {
    withTmpDir(dir => {
      const nested = path.join(dir, 'a', 'b');
      writeOutputs([{ start: 0, end: 1, text: 'hi' }], nested, 'test');
      expect(fs.existsSync(path.join(nested, 'test.txt'))).toBe(true);
    });
  });

  it('handles empty segment list', () => {
    withTmpDir(dir => {
      writeOutputs([], dir, 'empty');
      expect(fs.readFileSync(path.join(dir, 'empty.txt'), 'utf-8')).toBe('');
      expect(fs.readFileSync(path.join(dir, 'empty.srt'), 'utf-8')).toBe('');
    });
  });

  it('handles timestamp where ms rounds to 1000 without overflow', () => {
    withTmpDir(dir => {
      const segments: Segment[] = [
        { start: 0.9995, end: 1.9995, text: 'Edge case' },
      ];
      writeOutputs(segments, dir, 'test');
      const srt = fs.readFileSync(path.join(dir, 'test.srt'), 'utf-8');
      expect(srt).toContain('00:00:01,000 --> 00:00:02,000');
    });
  });
});
