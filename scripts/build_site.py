#!/usr/bin/env python3
"""Aggregate every designer's meta.json + links.json into site/data.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESIGNERS_DIR = ROOT / "designers"
SITE_DIR = ROOT / "site"
TAGS_FILE = ROOT / "data" / "tags.json"

DEFAULT_META = {
    "displayName": None,  # filled from folder name
    "emoji": "🎨",
    "color": "#3694FC",
    "folders": [{"id": "uncategorized", "name": "Uncategorized", "emoji": "📁", "color": "#3694FC"}],
}


def load_meta(designer_dir):
    meta_file = designer_dir / "meta.json"
    if meta_file.exists():
        meta = json.loads(meta_file.read_text())
    else:
        meta = dict(DEFAULT_META)
    meta.setdefault("displayName", designer_dir.name)
    meta.setdefault("emoji", "🎨")
    meta.setdefault("color", "#3694FC")
    meta.setdefault("folders", DEFAULT_META["folders"])
    return meta


def main():
    designers = []
    all_tags = set()
    if TAGS_FILE.exists():
        all_tags.update(json.loads(TAGS_FILE.read_text()))

    for designer_dir in sorted(DESIGNERS_DIR.iterdir()):
        links_file = designer_dir / "links.json"
        if not links_file.exists():
            continue
        entries = json.loads(links_file.read_text())
        for e in entries:
            e.setdefault("folder", "uncategorized")
            all_tags.update(e.get("tags", []))

        meta = load_meta(designer_dir)
        folder_ids = {f["id"] for f in meta["folders"]}
        for e in entries:
            if e["folder"] not in folder_ids:
                meta["folders"].append(
                    {"id": e["folder"], "name": e["folder"], "emoji": "📁", "color": "#3694FC"}
                )
                folder_ids.add(e["folder"])

        designers.append(
            {
                "slug": designer_dir.name,
                "displayName": meta["displayName"],
                "emoji": meta["emoji"],
                "color": meta["color"],
                "folders": meta["folders"],
                "links": entries,
            }
        )

    SITE_DIR.mkdir(exist_ok=True)
    data = {"designers": designers, "suggestedTags": sorted(all_tags)}
    (SITE_DIR / "data.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    total = sum(len(d["links"]) for d in designers)
    print(f"Wrote site/data.json — {len(designers)} designer(s), {total} link(s)")


if __name__ == "__main__":
    main()
