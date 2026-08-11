#!/usr/bin/env python3
"""Regenerate each designer's README.md from their links.json, and a root INDEX.md."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESIGNERS_DIR = ROOT / "designers"


def render_designer_readme(name, entries):
    lines = [f"# {name}", ""]
    for e in sorted(entries, key=lambda x: x.get("created_at", ""), reverse=True):
        lines.append(f"### [{e['name']}]({e['url']})")
        if e.get("description"):
            lines.append(f"{e['description']}")
        meta = f"_Added: {e.get('created_at', '?')}"
        if e.get("updated_at") and e["updated_at"] != e.get("created_at"):
            meta += f" · Updated: {e['updated_at']}"
        meta += "_"
        lines.append(meta)
        if e.get("tags"):
            lines.append(" ".join(f"`{t}`" for t in e["tags"]))
        lines.append("")
    return "\n".join(lines)


def main():
    if not DESIGNERS_DIR.exists():
        print("No designers/ directory found.")
        return

    index_lines = ["# NDLR Index", ""]

    for designer_dir in sorted(DESIGNERS_DIR.iterdir()):
        links_file = designer_dir / "links.json"
        if not links_file.exists():
            continue
        entries = json.loads(links_file.read_text())
        readme = render_designer_readme(designer_dir.name, entries)
        (designer_dir / "README.md").write_text(readme)
        index_lines.append(f"- [{designer_dir.name}](designers/{designer_dir.name}/README.md) — {len(entries)} link(s)")

    (ROOT / "INDEX.md").write_text("\n".join(index_lines) + "\n")
    print("Rendered README.md for each designer and root INDEX.md")


if __name__ == "__main__":
    main()
