# Deploying NDLR with in-site editing

The site under [`site/`](site/) is a static frontend, but the "+ Designer / + Folder / + Link"
popups write back to this GitHub repo through a small serverless backend
([`netlify/functions/`](netlify/functions/)). GitHub Pages can only serve static files, so this
part needs a host that runs serverless functions. These steps use Netlify (free tier, deploys
straight from GitHub) — swap hosts later if your org's approved-vendor list says otherwise.

## 1. Create a GitHub token the functions can use

The popups have no login — instead, the functions hold one shared credential and commit on
everyone's behalf, same as the "type the code to get in" gate already does for read access.

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token.
2. Resource owner: this repo's org/account. Repository access: only this repo (`NiCE-Designer-Link-Repo`).
3. Permissions → Repository permissions → **Contents: Read and write**.
4. Copy the generated token — you'll paste it into Netlify next, and GitHub won't show it again.

## 2. Connect the repo to Netlify

1. https://app.netlify.com → **Add new site → Import an existing project** → GitHub → pick this repo.
2. Build settings: leave the defaults — [`netlify.toml`](netlify.toml) already sets
   `publish = "site"` and `functions = "netlify/functions"`.
3. Deploy the site once (it'll work read-only immediately; writes need step 3 below).

## 3. Set the environment variables

Netlify → Site configuration → Environment variables → add:

| Key | Value |
|---|---|
| `GITHUB_TOKEN` | the token from step 1 |
| `GITHUB_REPO` | `Erick-NiCE/NiCE-Designer-Link-Repo` |
| `GITHUB_BRANCH` | `main` |

Redeploy after adding these (Netlify → Deploys → Trigger deploy) so the functions pick them up.

## 4. Try it

Open the Netlify URL, unlock the site-wide gate, click **+ Designer** / **+ Folder** / **+ Link**.
Each save commits directly to this repo (`designers/<slug>/meta.json` and `links.json`, plus
`site/data.json` so the change shows up immediately without waiting for a rebuild).

## Notes / limits

- The site password (`site-gate.js`) and this write flow are both soft deterrents, not real
  auth — anyone who has the code can add/edit entries, and the token lives server-side but any
  visitor's browser can call the functions directly. Fine for an internal team tool; not a
  substitute for real access control if this ever needs stricter permissions.
- `scripts/build_site.py` remains available for a full local rebuild of `site/data.json` from
  the JSON source files, if it ever drifts (e.g. someone hand-edits `links.json` in git directly).
- The link-preview function does a basic SSRF check (blocks localhost/private IPs) but is not a
  hardened proxy — don't expose it beyond this internal tool's use case.
