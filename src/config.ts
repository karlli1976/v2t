import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Config, ResolvedConfig } from './types.js';

const CONFIG_PATH = path.join(process.cwd(), '.v2t.json');

const DEFAULTS = {
  language: 'zh',
  model: 'turbo',
  backend: 'local',
  cacheDir: 'cache',
} as const;

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Config;
  } catch {
    return {};
  }
}

export function resolveConfig(cliFlags: Partial<ResolvedConfig>): ResolvedConfig {
  const fileConfig = loadConfig();
  const envApiKey = process.env.OPENAI_API_KEY;

  return {
    language:     cliFlags.language    ?? fileConfig.language    ?? DEFAULTS.language,
    model:        cliFlags.model       ?? fileConfig.model       ?? DEFAULTS.model,
    backend:      cliFlags.backend     ?? fileConfig.backend     ?? DEFAULTS.backend,
    outputDir:    path.resolve(cliFlags.outputDir ?? fileConfig.outputDir ?? 'transcripts'),
    cacheDir:     path.resolve(cliFlags.cacheDir   ?? fileConfig.cacheDir   ?? DEFAULTS.cacheDir),
    openaiApiKey: cliFlags.openaiApiKey ?? fileConfig.openaiApiKey ?? envApiKey,
  };
}
