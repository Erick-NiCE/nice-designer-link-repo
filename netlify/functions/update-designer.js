const { getFile, putFile, isValidSlug, jsonResponse } = require("./_github");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const slug = body.slug;
  const patch = body.patch || {};
  if (!isValidSlug(slug)) return jsonResponse(400, { error: "Invalid slug" });

  const metaPath = `designers/${slug}/meta.json`;
  const meta = await getFile(metaPath);
  if (!meta.json) return jsonResponse(404, { error: `Designer "${slug}" not found` });

  if (typeof patch.displayName === "string" && patch.displayName.trim()) meta.json.displayName = patch.displayName.trim();
  if (typeof patch.emoji === "string" && patch.emoji) meta.json.emoji = patch.emoji.slice(0, 8);
  if (/^#[0-9a-fA-F]{6}$/.test(patch.color || "")) meta.json.color = patch.color;

  await putFile(metaPath, meta.json, `NDLR: edit designer "${meta.json.displayName}"`, meta.sha);

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    const designer = data.json.designers.find((d) => d.slug === slug);
    if (designer) {
      designer.displayName = meta.json.displayName;
      designer.emoji = meta.json.emoji;
      designer.color = meta.json.color;
    }
    await putFile(dataPath, data.json, `NDLR: edit designer "${meta.json.displayName}" in site data`, data.sha);
  }

  return jsonResponse(200, { slug, displayName: meta.json.displayName, emoji: meta.json.emoji, color: meta.json.color });
};
