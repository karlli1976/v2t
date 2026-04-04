import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Config, ResolvedConfig } from './types.js';

const CONFIG_PATH = path.join(os.homedir(), '.v2t.json');

const DEFAULTS: ResolvedConfig = {
  language: 'zh',
  model: 'turbo',
  backend: 'local',
  outputDir: process.cwd(),
};

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
    outputDir:    cliFlags.outputDir   ?? fileConfig.outputDir   ?? DEFAULTS.outputDir,
    openaiApiKey: cliFlags.openaiApiKey ?? fileConfig.openaiApiKey ?? envApiKey,
  };
}
