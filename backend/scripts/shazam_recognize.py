import asyncio
import json
import sys

from shazamio import Shazam


def first_metadata(track, title):
    for section in track.get("sections", []):
        for item in section.get("metadata", []):
            if item.get("title", "").casefold() == title.casefold():
                return item.get("text")
    return None


async def recognize(audio):
    async with Shazam() as shazam:
        result = await shazam.recognize(audio)

    track = result.get("track") if isinstance(result, dict) else None
    if not isinstance(track, dict):
        return {"success": True, "resultado": None}

    images = track.get("images") or {}
    share = track.get("share") or {}
    output = {
        "titulo": track.get("title"),
        "artista": track.get("subtitle"),
        "album": first_metadata(track, "Album"),
        "ano": first_metadata(track, "Released"),
        "genero": first_metadata(track, "Genre"),
        "capa": images.get("coverart") or images.get("coverarthq"),
        "preview": None,
        "url_shazam": share.get("href"),
    }
    return {"success": True, "resultado": output}


def main():
    audio = sys.stdin.buffer.read(50 * 1024 * 1024 + 1)
    if not audio or len(audio) > 50 * 1024 * 1024:
        raise ValueError("invalid-audio-size")
    result = asyncio.run(recognize(audio))
    sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.stderr.write("recognition-failed\n")
        sys.exit(1)
