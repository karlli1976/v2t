import OpenAI from 'openai';
import * as fs from 'fs';
export async function transcribeOpenAI(audioPath, language, apiKey) {
    const client = new OpenAI({ apiKey });
    const response = await client.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        language,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
    });
    const segments = response.segments ?? [];
    return segments.map(s => ({ start: s.start, end: s.end, text: s.text }));
}
