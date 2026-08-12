const { getFile, putFile, isValidSlug, isSafePublicUrl, jsonResponse } = require("./_github");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const designerSlug = body.designerSlug;
  const linkId = body.linkId;
  const patch = body.patch || {};
  if (!isValidSlug(designerSlug)) return jsonResponse(400, { error: "Invalid designerSlug" });
  if (typeof linkId !== "string" || !linkId) return jsonResponse(400, { error: "linkId is required" });

  const linksPath = `designers/${designerSlug}/links.json`;
  const links = await getFile(linksPath);
  if (!links.json) return jsonResponse(404, { error: `Designer "${designerSlug}" not found` });

  const idx = links.json.findIndex((l) => l.id === linkId);
  if (idx === -1) return jsonResponse(404, { error: `Link "${linkId}" not found` });

  const entry = links.json[idx];
  if (typeof patch.name === "string" && patch.name.trim()) entry.name = patch.name.trim();
  if (typeof patch.description === "string") entry.description = patch.description.slice(0, 500);
  if (typeof patch.url === "string" && patch.url.trim()) {
    if (!isSafePublicUrl(patch.url)) return jsonResponse(400, { error: "url must be a public http(s) URL" });
    entry.url = patch.url.trim();
  }
  if (Array.isArray(patch.tags)) {
    entry.tags = patch.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20);
  }
  if (typeof patch.folder === "string" && patch.folder) entry.folder = patch.folder;
  if (patch.preview && typeof patch.preview === "object") entry.preview = patch.preview;
  entry.updated_at = new Date().toISOString();

  await putFile(linksPath, links.json, `NDLR: edit link "${entry.name}" for ${designerSlug}`, links.sha);

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    const designer = data.json.designers.find((d) => d.slug === designerSlug);
    if (designer) {
      const dIdx = designer.links.findIndex((l) => l.id === linkId);
      if (dIdx !== -1) designer.links[dIdx] = entry;
    }
    await putFile(dataPath, data.json, `NDLR: edit link "${entry.name}" in site data`, data.sha);
  }

  return jsonResponse(200, { link: entry });
};
