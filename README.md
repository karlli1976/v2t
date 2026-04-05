# v2t

Extract transcripts from video URLs (YouTube, X/Twitter, and anything yt-dlp supports).

## Requirements

- [Node.js](https://nodejs.org/) >= 18
- [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)
- [ffmpeg](https://ffmpeg.org/download.html)
- For local backend: [openai-whisper](https://github.com/openai/whisper) (`pip install openai-whisper`)
- For OpenAI backend: an OpenAI API key

## Install

```bash
npm install -g .
```

## Usage

```bash
v2t <url>
```

Output is saved to `./transcripts/` as `<title>.txt` and `<title>.srt`. The paths are printed to stdout on completion.

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --language <code>` | Language code (e.g. `en`, `zh`, `ja`) | `zh` |
| `-m, --model <name>` | Whisper model (`turbo`, `base`, `small`, `medium`, `large`) | `turbo` |
| `-b, --backend <name>` | Transcription backend: `local` or `openai` | `local` |
| `-o, --output <dir>` | Output directory | `./transcripts` |
| `--api-key <key>` | OpenAI API key (for `--backend openai`) | |

### Examples

```bash
# Transcribe a YouTube video
v2t https://www.youtube.com/watch?v=xxx

# Use English, large model
v2t -l en -m large https://www.youtube.com/watch?v=xxx

# Use OpenAI backend
v2t -b openai --api-key sk-... https://www.youtube.com/watch?v=xxx
```

## Configuration

Create a `.v2t.json` in your working directory to set defaults:

```json
{
  "language": "en",
  "model": "turbo",
  "backend": "local",
  "outputDir": "./transcripts"
}
```

The `OPENAI_API_KEY` environment variable is also supported for the OpenAI backend.
