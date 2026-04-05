import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
function sanitizeFilename(name) {
    return name
        .replace(/[\x00-\x1f\x7f]/g, '-')
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .slice(0, 200) || 'untitled';
}
function fallbackTitle() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}
function parseDuration(s) {
    const parts = s.trim().split(':').map(Number);
    if (!parts.length || parts.some(isNaN))
        return null;
    if (parts.length === 2)
        return parts[0] * 60 + parts[1];
    if (parts.length === 3)
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
}
function checkYtDlp() {
    const result = spawnSync('yt-dlp', ['--version'], { encoding: 'utf-8' });
    if (result.error || result.status !== 0) {
        throw new Error('yt-dlp not found on PATH.\n' +
            'Install it: https://github.com/yt-dlp/yt-dlp#installation\n' +
            '  macOS:   brew install yt-dlp\n' +
            '  Windows: winget install yt-dlp  (or pip install yt-dlp)\n' +
            '  Linux:   pip install yt-dlp');
    }
}
export function download(url) {
    checkYtDlp();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v2t-'));
    const cleanup = () => fs.rmSync(tmpDir, { recursive: true, force: true });
    let title;
    let durationSec = null;
    try {
        const lines = execFileSync('yt-dlp', ['--get-title', '--get-duration', '--no-playlist', url], { encoding: 'utf-8' }).trim().split('\n');
        title = sanitizeFilename(lines[0] ?? '');
        durationSec = parseDuration(lines[1] ?? '');
    }
    catch {
        title = fallbackTitle();
    }
    try {
        execFileSync('yt-dlp', [
            '-f', 'bestaudio/best',
            '-x', '--audio-format', 'wav',
            '--no-playlist',
            '-o', path.join(tmpDir, 'audio.%(ext)s'),
            url,
        ], { stdio: 'ignore' });
    }
    catch (err) {
        cleanup();
        throw err;
    }
    const audioPath = path.join(tmpDir, 'audio.wav');
    if (!fs.existsSync(audioPath)) {
        cleanup();
        throw new Error(`Download succeeded but audio file not found at: ${audioPath}`);
    }
    return { audioPath, title, durationSec, cleanup };
}
