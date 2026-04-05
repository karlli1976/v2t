import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from './downloader.js';

describe('sanitizeFilename', () => {
  it('preserves Chinese characters', () => {
    expect(sanitizeFilename('张雪机车夺冠')).toBe('张雪机车夺冠');
  });

  it('preserves real video title with simplified and traditional Chinese', () => {
    const input = '张雪夺冠真是制度优越性的体现？政府到底是托举，还是在给他拖后腿？張雪奪冠真是製度優越性的體現？政府到底是托舉，還是在給他拖後腿？';
    expect(sanitizeFilename(input)).toBe(input);
  });

  it('preserves mixed Chinese and ASCII', () => {
    expect(sanitizeFilename('张雪 - Zhangxue 2024')).toBe('张雪 - Zhangxue 2024');
  });

  it('replaces Windows-illegal characters with dashes', () => {
    expect(sanitizeFilename('foo:bar')).toBe('foo-bar');
    expect(sanitizeFilename('a/b\\c')).toBe('a-b-c');
    expect(sanitizeFilename('a*b?c')).toBe('a-b-c');
  });

  it('collapses consecutive dashes', () => {
    expect(sanitizeFilename('a:::b')).toBe('a-b');
  });

  it('strips leading and trailing dashes', () => {
    expect(sanitizeFilename(':foo:')).toBe('foo');
    expect(sanitizeFilename(':::?')).toBe('untitled');
  });

  it('falls back to untitled when result is empty', () => {
    expect(sanitizeFilename('')).toBe('untitled');
    expect(sanitizeFilename(':::')).toBe('untitled');
  });

  it('removes control characters without turning them into dashes', () => {
    expect(sanitizeFilename('foo\x00bar')).toBe('foobar');
  });
});
