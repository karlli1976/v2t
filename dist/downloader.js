import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
export function sanitizeFilename(name) {
    return name
        .replaceAll(/[\x00-\x1f\x7f]/g, '')
        .replaceAll(/[\\/:*?"<>|]/g, '-')
        .replaceAll(/-+/g, '-')
        .replaceAll(/^-+|-+$/g, '')
        .trim()
        .slice(0, 200) || 'untitled';
}
function fallbackTitle() {
    return new Date().toISOString().replaceAll(/[:.]/g, '-');
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
function urlCacheKey(url) {
    return createHash('sha1').update(url).digest('hex').slice(0, 16);
}
const AUDIO_EXTS = ['.m4a', '.opus', '.webm', '.wav', '.mp3'];
const ytEnv = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
const DUMP_JSON_OPTS = { encoding: 'utf-8', env: ytEnv, maxBuffer: 32 * 1024 * 1024 };
// ── helpers ──────────────────────────────────────────────────────────────────
function fetchMetadata(url) {
    // --dump-json outputs Unicode as \uXXXX, surviving Windows console code-page
    // mangling that turns non-ASCII into '?' when using --get-title.
    try {
        const raw = execFileSync('yt-dlp', ['--dump-json', '--no-playlist', url], DUMP_JSON_OPTS);
        const info = JSON.parse(raw);
        return {
            title: sanitizeFilename(info.title ?? '') || fallbackTitle(),
            durationSec: info.duration ?? null,
        };
    }
    catch {
        return { title: fallbackTitle(), durationSec: null };
    }
}
function resolveCachedTitle(meta, metaPath, url) {
    if (meta.title !== 'untitled')
        return meta.title;
    try {
        const raw = execFileSync('yt-dlp', ['--dump-json', '--no-playlist', url], DUMP_JSON_OPTS);
        const info = JSON.parse(raw);
        const resolved = sanitizeFilename(info.title ?? '');
        if (resolved && resolved !== 'untitled') {
            meta.title = resolved;
            fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf-8');
        }
    }
    catch { /* title is optional */ }
    return meta.title;
}
function findCachedAudio(cacheDir, key, metaPath) {
    if (fs.existsSync(metaPath)) {
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            const candidate = path.join(cacheDir, `${key}${meta.ext ?? '.wav'}`);
            if (fs.existsSync(candidate))
                return candidate;
        }
        catch { /* ignore */ }
    }
    return AUDIO_EXTS.map(e => path.join(cacheDir, `${key}${e}`)).find(p => fs.existsSync(p));
}
function downloadToCache(url, cacheDir, key, metaPath, title, durationSec) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v2t-'));
    try {
        execFileSync('yt-dlp', ['-f', 'bestaudio/best', '-x', '--audio-format', 'm4a', '--no-playlist',
            '-o', path.join(tmpDir, 'audio.%(ext)s'), url], { stdio: 'ignore', env: ytEnv });
        const actualAudio = ['.m4a', '.opus', '.webm']
            .map(e => path.join(tmpDir, `audio${e}`))
            .find(p => fs.existsSync(p));
        if (!actualAudio)
            throw new Error(`Download succeeded but audio file not found in: ${tmpDir}`);
        const ext = path.extname(actualAudio);
        const cachedAudio = path.join(cacheDir, `${key}${ext}`);
        fs.renameSync(actualAudio, cachedAudio);
        fs.writeFileSync(metaPath, JSON.stringify({ url, title, durationSec, ext }), 'utf-8');
        return cachedAudio;
    }
    finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}
// ── public API ────────────────────────────────────────────────────────────────
export function download(url, cacheDir) {
    checkYtDlp();
    fs.mkdirSync(cacheDir, { recursive: true });
    const key = urlCacheKey(url);
    const metaPath = path.join(cacheDir, `${key}.json`);
    const cachedAudio = findCachedAudio(cacheDir, key, metaPath);
    if (cachedAudio) {
        let meta = { url, title: 'untitled', durationSec: null };
        try {
            meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        }
        catch { /* ignore */ }
        const title = resolveCachedTitle(meta, metaPath, url);
        return { audioPath: cachedAudio, title, durationSec: meta.durationSec, cleanup: () => { }, cached: true };
    }
    const { title, durationSec } = fetchMetadata(url);
    const audioPath = downloadToCache(url, cacheDir, key, metaPath, title, durationSec);
    return { audioPath, title, durationSec, cleanup: () => { }, cached: false };
}
