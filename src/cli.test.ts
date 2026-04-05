import { describe, it, expect } from 'vitest';
import { fmt, elapsed, progressBar } from './display.js';

describe('fmt', () => {
  it('formats 0 seconds', () => expect(fmt(0)).toBe('00:00'));
  it('formats 65 seconds', () => expect(fmt(65)).toBe('01:05'));
  it('formats 3661 seconds', () => expect(fmt(3661)).toBe('61:01'));
  it('truncates fractional seconds', () => expect(fmt(59.9)).toBe('00:59'));
});

describe('elapsed', () => {
  it('formats 1000ms as 1.0s', () => expect(elapsed(1000)).toBe('1.0s'));
  it('formats 8800ms as 8.8s', () => expect(elapsed(8800)).toBe('8.8s'));
  it('formats 100ms as 0.1s', () => expect(elapsed(100)).toBe('0.1s'));
});

describe('progressBar', () => {
  it('returns just fmt(current) when total is null', () => {
    expect(progressBar(65, null)).toBe('01:05');
  });

  it('returns just fmt(current) when total is 0', () => {
    expect(progressBar(0, 0)).toBe('00:00');
  });

  it('shows 0% bar at start', () => {
    const result = progressBar(0, 100);
    expect(result).toContain('  0%');
    expect(result).toContain('00:00 / 01:40');
    expect(result).toContain('░'.repeat(24));
  });

  it('shows 50% bar at midpoint', () => {
    const result = progressBar(50, 100);
    expect(result).toContain(' 50%');
    expect(result).toContain('00:50 / 01:40');
    expect(result).toContain('█'.repeat(12));
    expect(result).toContain('░'.repeat(12));
  });

  it('shows 100% bar at end', () => {
    const result = progressBar(100, 100);
    expect(result).toContain('100%');
    expect(result).toContain('█'.repeat(24));
    expect(result).not.toContain('░');
  });

  it('clamps at 100% when current exceeds total', () => {
    const result = progressBar(120, 100);
    expect(result).toContain('100%');
    expect(result).toContain('█'.repeat(24));
  });
});

describe('progress output sequence', () => {
  it('initial message uses \\r so onProgress can overwrite it on the same line', () => {
    const initial = 'Transcribing...\r';
    expect(initial.endsWith('\r')).toBe(true);
    expect(initial.startsWith('\r')).toBe(false);
  });

  it('onProgress message uses leading \\r to overwrite the initial message', () => {
    const calls: string[] = [];
    const onProgress = (currentSec: number) => {
      calls.push(`\rTranscribing  ${progressBar(currentSec, 120)}   `);
    };

    onProgress(0);
    onProgress(60);
    onProgress(120);

    for (const c of calls) {
      expect(c.startsWith('\r')).toBe(true);
    }
    for (const c of calls) {
      expect(c).not.toContain('\n');
    }
    expect(calls[1]).toContain('50%');
    expect(calls[2]).toContain('100%');
  });

  it('completion message uses leading \\r and trailing \\n to finalise the line', () => {
    const transcribeMs = 42000;
    const completion = `\r✓ Transcription   ${elapsed(transcribeMs)}\n`;
    expect(completion.startsWith('\r')).toBe(true);
    expect(completion.endsWith('\n')).toBe(true);
    expect(completion).toContain('42.0s');
  });
});
