import * as fs from 'fs';
import * as path from 'path';
const CONFIG_PATH = path.join(process.cwd(), '.v2t.json');
const DEFAULTS = {
    language: 'zh',
    model: 'turbo',
    backend: 'local',
};
export function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH))
        return {};
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
    catch {
        return {};
    }
}
export function resolveConfig(cliFlags) {
    const fileConfig = loadConfig();
    const envApiKey = process.env.OPENAI_API_KEY;
    return {
        language: cliFlags.language ?? fileConfig.language ?? DEFAULTS.language,
        model: cliFlags.model ?? fileConfig.model ?? DEFAULTS.model,
        backend: cliFlags.backend ?? fileConfig.backend ?? DEFAULTS.backend,
        outputDir: path.resolve(cliFlags.outputDir ?? fileConfig.outputDir ?? 'transcripts'),
        openaiApiKey: cliFlags.openaiApiKey ?? fileConfig.openaiApiKey ?? envApiKey,
    };
}
