#!/usr/bin/env python3
"""Pillow orqali rasm EXIF (asosan Software) — Node API ixtiyoriy chaqiradi."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "no_path"}))
        return 1
    path = Path(sys.argv[1])
    if not path.is_file():
        print(json.dumps({"ok": False, "error": "not_file"}))
        return 1
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
    except ImportError:
        print(json.dumps({"ok": False, "error": "pillow_missing"}))
        return 2
    try:
        with Image.open(path) as img:
            exif = img.getexif()
            software = None
            if exif:
                for k, v in exif.items():
                    if TAGS.get(k) == "Software" and v:
                        software = str(v).strip() or None
                        break
        print(json.dumps({"ok": True, "software": software}))
        return 0
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(e)}))
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
