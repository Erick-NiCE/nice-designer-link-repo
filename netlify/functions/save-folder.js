const { getFile, putFile, isValidSlug, slugify, jsonResponse } = require("./_github");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const designerSlug = body.designerSlug;
  const name = String((body.folder && body.folder.name) || "").trim();
  if (!isValidSlug(designerSlug)) return jsonResponse(400, { error: "Invalid designerSlug" });
  if (!name) return jsonResponse(400, { error: "folder.name is required" });

  const emoji = String((body.folder && body.folder.emoji) || "📁").slice(0, 8);
  const color = /^#[0-9a-fA-F]{6}$/.test((body.folder || {}).color) ? body.folder.color : "#3694FC";

  const metaPath = `designers/${designerSlug}/meta.json`;
  const meta = await getFile(metaPath);
  if (!meta.json) return jsonResponse(404, { error: `Designer "${designerSlug}" not found` });

  let id = isValidSlug((body.folder || {}).id) ? body.folder.id : slugify(name);
  const existingIds = new Set(meta.json.folders.map((f) => f.id));
  let candidate = id;
  let n = 2;
  while (existingIds.has(candidate)) {
    candidate = `${id}-${n++}`;
  }
  id = candidate;

  const folder = { id, name, emoji, color };
  meta.json.folders.push(folder);
  await putFile(metaPath, meta.json, `NDLR: add folder ${name} for ${designerSlug}`, meta.sha);

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    const designer = data.json.designers.find((d) => d.slug === designerSlug);
    if (designer) designer.folders.push(folder);
    await putFile(dataPath, data.json, `NDLR: add folder ${name} to site data`, data.sha);
  }

  return jsonResponse(200, { folder });
};
