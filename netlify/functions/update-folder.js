const { getFile, putFile, isValidSlug, jsonResponse } = require("./_github");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const designerSlug = body.designerSlug;
  const folderId = body.folderId;
  const patch = body.patch || {};
  if (!isValidSlug(designerSlug)) return jsonResponse(400, { error: "Invalid designerSlug" });
  if (typeof folderId !== "string" || !folderId) return jsonResponse(400, { error: "folderId is required" });

  const metaPath = `designers/${designerSlug}/meta.json`;
  const meta = await getFile(metaPath);
  if (!meta.json) return jsonResponse(404, { error: `Designer "${designerSlug}" not found` });

  const folder = meta.json.folders.find((f) => f.id === folderId);
  if (!folder) return jsonResponse(404, { error: `Folder "${folderId}" not found` });

  if (typeof patch.name === "string" && patch.name.trim()) folder.name = patch.name.trim();
  if (typeof patch.emoji === "string" && patch.emoji) folder.emoji = patch.emoji.slice(0, 8);
  if (/^#[0-9a-fA-F]{6}$/.test(patch.color || "")) folder.color = patch.color;

  await putFile(metaPath, meta.json, `NDLR: edit folder "${folder.name}" for ${designerSlug}`, meta.sha);

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    const designer = data.json.designers.find((d) => d.slug === designerSlug);
    if (designer) {
      const f = designer.folders.find((f) => f.id === folderId);
      if (f) Object.assign(f, folder);
    }
    await putFile(dataPath, data.json, `NDLR: edit folder "${folder.name}" in site data`, data.sha);
  }

  return jsonResponse(200, { folder });
};
