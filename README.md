# NiCE Designer Link Repo (NDLR)

A shared repo where designers attach links to their design files (Figma, FigJam, prototypes, etc.) — each link tracked with a name, description, and timestamp.

## How it works

- Every designer has a folder under [`designers/`](designers/) named after them.
- Each folder holds a `links.json` — the source of truth for that designer's links.
- Running `scripts/render_readmes.py` regenerates a human-readable `README.md` per designer and a root [`INDEX.md`](INDEX.md) listing everyone.
- [`site/`](site/) is a browsable version of the same data — designer folders → sub-folders → link cards with previews, styled to match the NiCE Designer site and gated behind an access code (see `site/site-gate.js`). The "+ Designer / + Folder / + Link" popups write straight back to this repo via [`netlify/functions/`](netlify/functions/) — see [`DEPLOY.md`](DEPLOY.md) for hosting setup.
- Running `scripts/build_site.py` regenerates [`site/data.json`](site/data.json) from the JSON source files if it ever drifts.

## Adding a link

1. Find (or create) your folder under `designers/<your-name>/`.
2. Add an entry to your `links.json` following the shape in [`.templates/link-entry.schema.json`](.templates/link-entry.schema.json):

```json
{
  "id": "short-unique-slug",
  "name": "Design Name",
  "url": "https://figma.com/file/...",
  "description": "What this is / where it's at",
  "created_at": "2026-08-11T14:00:00Z",
  "updated_at": "2026-08-11T14:00:00Z",
  "tags": ["figma", "mobile"]
}
```

3. Run:

```bash
python3 scripts/render_readmes.py
python3 scripts/build_site.py
```

4. Commit and push.

See [`.templates/example-designer/links.json`](.templates/example-designer/links.json) for a full example.

## Note

This repo is currently **public** while we validate the workflow, ahead of upgrading to a licensed plan that supports private repos with GitHub Pages. Don't put sensitive client info in descriptions or filenames until it's private.
