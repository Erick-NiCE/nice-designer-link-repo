const { getFile, putFile, isValidSlug, slugify, jsonResponse } = require("./_github");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const displayName = String(body.displayName || "").trim();
  if (!displayName) return jsonResponse(400, { error: "displayName is required" });

  const slug = isValidSlug(body.slug) ? body.slug : slugify(displayName);
  const emoji = String(body.emoji || "🎨").slice(0, 8);
  const color = /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : "#3694FC";

  const metaPath = `designers/${slug}/meta.json`;
  const linksPath = `designers/${slug}/links.json`;

  const existingMeta = await getFile(metaPath);
  if (existingMeta.json) return jsonResponse(409, { error: `Designer "${slug}" already exists` });

  const meta = {
    displayName,
    emoji,
    color,
    folders: [{ id: "uncategorized", name: "Uncategorized", emoji: "📁", color: "#3694FC" }],
  };

  await putFile(metaPath, meta, `NDLR: add designer ${displayName}`, null);
  await putFile(linksPath, [], `NDLR: init links.json for ${displayName}`, null);

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    data.json.designers.push({
      slug,
      displayName,
      emoji,
      color,
      folders: meta.folders,
      links: [],
    });
    await putFile(dataPath, data.json, `NDLR: add designer ${displayName} to site data`, data.sha);
  }

  return jsonResponse(200, { slug, displayName, emoji, color, folders: meta.folders });
};
