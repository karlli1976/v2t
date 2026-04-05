#!/usr/bin/env python3
"""
Thin CLI wrapper around the faster-whisper Python library.
Emits segment lines in the same format as the openai-whisper CLI:
  [MM:SS.mmm --> MM:SS.mmm]  text
so that the Node.js parseLine() function can consume it unchanged.
"""
import sys
import argparse
from faster_whisper import WhisperModel


def fmt_ts(seconds: float) -> str:
    m = int(seconds // 60)
    s = seconds - m * 60
    return f"{m:02d}:{s:06.3f}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio")
    parser.add_argument("--model", default="turbo")
    parser.add_argument("--language", default="zh")
    parser.add_argument("--beam_size", type=int, default=1)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--condition_on_previous_text", type=lambda x: x.lower() != "false", default=False)
    args = parser.parse_args()

    model = WhisperModel(args.model, device="cuda", compute_type="float16")
    segments, _ = model.transcribe(
        args.audio,
        language=args.language,
        task="transcribe",
        beam_size=args.beam_size,
        temperature=args.temperature,
        condition_on_previous_text=args.condition_on_previous_text,
    )

    for seg in segments:
        line = f"[{fmt_ts(seg.start)} --> {fmt_ts(seg.end)}]  {seg.text.strip()}"
        print(line, flush=True)


if __name__ == "__main__":
    main()
