import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// We'll mock the fs.existsSync and fs.readFileSync used inside config.ts
// to control what the "config file" contains in each test.

describe('resolveConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('returns hardcoded defaults when no config file or flags', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const { resolveConfig } = await import('./config.js');
    const result = resolveConfig({});
    expect(result.language).toBe('zh');
    expect(result.model).toBe('turbo');
    expect(result.backend).toBe('local');
    expect(result.outputDir).toBe(path.join(process.cwd(), 'transcripts'));
    expect(result.openaiApiKey).toBeUndefined();
  });

  it('config file values override defaults', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({ language: 'en', model: 'base' })
    );
    const { resolveConfig } = await import('./config.js');
    const result = resolveConfig({});
    expect(result.language).toBe('en');
    expect(result.model).toBe('base');
    expect(result.backend).toBe('local'); // still default
  });

  it('CLI flags override config file values', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({ language: 'en' })
    );
    const { resolveConfig } = await import('./config.js');
    const result = resolveConfig({ language: 'ja' });
    expect(result.language).toBe('ja');
  });

  it('config file openaiApiKey overrides env var', async () => {
    process.env.OPENAI_API_KEY = 'from-env';
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({ openaiApiKey: 'from-config' })
    );
    const { resolveConfig } = await import('./config.js');
    const result = resolveConfig({});
    expect(result.openaiApiKey).toBe('from-config');
  });

  it('env var used when config file has no openaiApiKey', async () => {
    process.env.OPENAI_API_KEY = 'from-env';
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const { resolveConfig } = await import('./config.js');
    const result = resolveConfig({});
    expect(result.openaiApiKey).toBe('from-env');
  });
});
