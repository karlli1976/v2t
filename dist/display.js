export function fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function elapsed(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
}
export function progressBar(current, total) {
    const W = 24;
    if (total && total > 0) {
        const pct = Math.min(current / total, 1);
        const filled = Math.round(pct * W);
        const bar = '█'.repeat(filled) + '░'.repeat(W - filled);
        return `[${bar}] ${String(Math.round(pct * 100)).padStart(3)}%  ${fmt(current)} / ${fmt(total)}`;
    }
    return fmt(current);
}
