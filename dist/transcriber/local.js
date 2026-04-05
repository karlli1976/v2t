import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
function checkWhisper() {
    const result = spawnSync('whisper', ['--help'], { encoding: 'utf-8' });
    if (result.error) {
        throw new Error('whisper not found on PATH.\n' +
            'Install it: pip install openai-whisper\n' +
            'Requires ffmpeg: https://ffmpeg.org/download.html');
    }
}
// Parses whisper's MM:SS.mmm timestamp format to seconds.
function parseWhisperTs(ts) {
    const [min, sec] = ts.split(':');
    return parseInt(min, 10) * 60 + parseFloat(sec);
}
export function transcribeLocal(audioPath, language, model, onProgress) {
    checkWhisper();
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v2t-whisper-'));
    return new Promise((resolve, reject) => {
        const proc = spawn('whisper', [
            audioPath,
            '--model', model,
            '--language', language,
            '--task', 'transcribe',
            '--output_dir', outDir,
            '--output_format', 'json',
        ], { stdio: ['ignore', 'pipe', 'ignore'] });
        // Whisper writes lines like: [00:00.000 --> 00:03.500]  text
        let buf = '';
        proc.stdout.on('data', (chunk) => {
            buf += chunk.toString();
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
                const match = line.match(/\[[\d:.]+ --> ([\d:.]+)\]/);
                if (match && onProgress) {
                    onProgress(parseWhisperTs(match[1]));
                }
            }
        });
        proc.on('close', (code) => {
            try {
                if (code !== 0) {
                    reject(new Error(`whisper exited with code ${code}`));
                    return;
                }
                const baseName = path.basename(audioPath, path.extname(audioPath));
                const jsonPath = path.join(outDir, `${baseName}.json`);
                const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
                resolve((raw.segments ?? []).map(s => ({ start: s.start, end: s.end, text: s.text })));
            }
            catch (err) {
                reject(err);
            }
            finally {
                fs.rmSync(outDir, { recursive: true, force: true });
            }
        });
        proc.on('error', (err) => {
            fs.rmSync(outDir, { recursive: true, force: true });
            reject(err);
        });
    });
}
