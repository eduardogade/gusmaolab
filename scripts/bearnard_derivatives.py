"""Generate the website's Bearnard derivatives from approved masters (P09).

The masters live in brand/bearnard/, which is gitignored and immutable: this script
only reads them. For each derivative listed below it

1. checks that the master is listed in assets/bearnard/inventory.csv as a
   canonical master or an approved derivative, and that its SHA-256 matches both
   the inventory and assets/bearnard/SHA256SUMS;
2. writes resized WebP files to public/illustrations/bearnard/ (never inside
   brand/), keeping the transparency and the aspect ratio, without cropping;
3. records their provenance in assets/bearnard/derivatives.json.

The derivatives and the provenance file are committed, so the site builds without the
masters. Rerun this only when an approved master changes on purpose, or when the
owner approves another illustration:

    python3 -I scripts/bearnard_derivatives.py

Requires Pillow with WebP support. Nothing else in the project needs Pillow.
"""

import csv
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, __version__ as pillow_version, features

REPO = Path(__file__).resolve().parent.parent
INVENTORY = REPO / "assets" / "bearnard" / "inventory.csv"
CHECKSUMS = REPO / "assets" / "bearnard" / "SHA256SUMS"
MANIFEST = REPO / "assets" / "bearnard" / "derivatives.json"
OUTPUT = REPO / "public" / "illustrations" / "bearnard"
MASTERS = REPO / "brand" / "bearnard"
APPROVED = {"canonical-master", "approved-derived"}
QUALITY = 80

# Each derivative: a stable ID (shared with src/illustrations/bearnard.ts), its master
# (as listed in the inventory) and the widths to produce, in CSS-independent pixels.
DERIVATIVES = [
    {
        "id": "bearnard-v1.3-portrait",
        "master": "brand/bearnard/bearnard_v1.3.png",
        "widths": [320, 640],
    },
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    if not features.check("webp"):
        print("Pillow lacks WebP support", file=sys.stderr)
        return 1
    with INVENTORY.open(newline="") as handle:
        inventory = {row["path"]: row for row in csv.DictReader(handle)}
    sums = {}
    for line in CHECKSUMS.read_text().splitlines():
        digest, path = line.split(maxsplit=1)
        sums[path.lstrip("*")] = digest

    OUTPUT.mkdir(parents=True, exist_ok=True)
    if MASTERS.resolve() in OUTPUT.resolve().parents or OUTPUT.resolve() == MASTERS:
        print("refusing to write inside brand/bearnard/", file=sys.stderr)
        return 1

    records = []
    for spec in DERIVATIVES:
        master = REPO / spec["master"]
        row = inventory.get(spec["master"])
        if row is None or row["category"] not in APPROVED:
            print(f"{spec['master']} is not an approved master", file=sys.stderr)
            return 1
        actual = sha256(master)
        if not (actual == row["sha256"] == sums.get(spec["master"])):
            print(
                f"{spec['master']} does not match its recorded checksum",
                file=sys.stderr,
            )
            return 1
        with Image.open(master) as source:
            source.load()
            width, height = source.size
            image = source.convert("RGBA")
        outputs = []
        for target in spec["widths"]:
            if target > width:
                continue
            size = (target, round(height * target / width))
            path = OUTPUT / f"{spec['id']}-{target}.webp"
            image.resize(size, Image.Resampling.LANCZOS).save(
                path, "WEBP", quality=QUALITY, method=6
            )
            outputs.append(
                {
                    "path": path.relative_to(REPO).as_posix(),
                    "url": "/" + path.relative_to(REPO / "public").as_posix(),
                    "width": size[0],
                    "height": size[1],
                    "bytes": path.stat().st_size,
                    "sha256": sha256(path),
                }
            )
        records.append(
            {
                "id": spec["id"],
                "source": {
                    "path": spec["master"],
                    "category": row["category"],
                    "sha256": actual,
                    "width": width,
                    "height": height,
                },
                "outputs": outputs,
            }
        )

    manifest = {
        "generator": "scripts/bearnard_derivatives.py",
        "tool": f"Pillow {pillow_version}",
        "settings": {
            "format": "WebP",
            "quality": QUALITY,
            "method": 6,
            "resample": "LANCZOS",
        },
        "derivatives": records,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    for record in records:
        for output in record["outputs"]:
            print(
                f"{output['path']}: {output['width']}x{output['height']}, {output['bytes']} bytes"
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
