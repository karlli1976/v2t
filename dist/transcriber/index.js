import { transcribeLocal } from './local.js';
import { transcribeOpenAI } from './openai.js';
export async function transcribe(audioPath, config, onProgress) {
    if (config.backend === 'openai') {
        if (!config.openaiApiKey) {
            throw new Error('OpenAI API key is required for the openai backend.\n' +
                'Set "openaiApiKey" in .v2t.json or set OPENAI_API_KEY env var.');
        }
        return transcribeOpenAI(audioPath, config.language, config.openaiApiKey, onProgress);
    }
    return transcribeLocal(audioPath, config.language, config.model, onProgress);
}
