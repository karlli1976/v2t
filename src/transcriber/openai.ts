import OpenAI from 'openai';
import * as fs from 'fs';
import type { Segment } from '../types.js';

export async function transcribeOpenAI(
  audioPath: string,
  language: string,
  apiKey: string
): Promise<Segment[]> {
  const client = new OpenAI({ apiKey });

  const response = await client.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    language,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const segments = (response as unknown as {
    segments?: Array<{ start: number; end: number; text: string }>;
  }).segments ?? [];

  return segments.map(s => ({ start: s.start, end: s.end, text: s.text }));
}
