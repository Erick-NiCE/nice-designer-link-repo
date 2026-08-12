// Shared GitHub Contents API helper for all write functions.
// Requires env vars: GITHUB_TOKEN (repo-scoped PAT with contents:write),
// GITHUB_REPO ("owner/repo"), GITHUB_BRANCH (defaults to "main").
const API = "https://api.github.com";

function authHeaders() {
  return {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    "User-Agent": "ndlr-site",
    Accept: "application/vnd.github+json",
  };
}

function repo() {
  const r = process.env.GITHUB_REPO;
  if (!r) throw new Error("GITHUB_REPO env var is not set");
  return r;
}

function branch() {
  return process.env.GITHUB_BRANCH || "main";
}

async function getFile(path) {
  const res = await fetch(
    `${API}/repos/${repo()}/contents/${path}?ref=${branch()}`,
    { headers: authHeaders() }
  );
  if (res.status === 404) return { json: null, sha: null };
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { json: JSON.parse(content), sha: data.sha };
}

async function putFile(path, jsonValue, message, sha) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(jsonValue, null, 2) + "\n", "utf-8").toString("base64"),
    branch: branch(),
  };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/repos/${repo()}/contents/${path}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

function isValidSlug(slug) {
  return typeof slug === "string" && SLUG_RE.test(slug);
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const BLOCKED_HOSTS = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|169\.254\.|\[?::1\]?|0\.0\.0\.0)/i;

function isSafePublicUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (BLOCKED_HOSTS.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = { getFile, putFile, isValidSlug, slugify, jsonResponse, isSafePublicUrl };
