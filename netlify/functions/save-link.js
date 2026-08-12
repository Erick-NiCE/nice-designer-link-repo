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
  const folderId = body.folderId || "uncategorized";
  const link = body.link || {};
  const name = String(link.name || "").trim();
  const url = String(link.url || "").trim();

  if (!isValidSlug(designerSlug)) return jsonResponse(400, { error: "Invalid designerSlug" });
  if (!name) return jsonResponse(400, { error: "link.name is required" });
  if (!isSafePublicUrl(url)) return jsonResponse(400, { error: "link.url must be a public http(s) URL" });

  const tags = Array.isArray(link.tags)
    ? link.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20)
    : [];

  const linksPath = `designers/${designerSlug}/links.json`;
  const links = await getFile(linksPath);
  if (!links.json) return jsonResponse(404, { error: `Designer "${designerSlug}" not found` });

  const now = new Date().toISOString();
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "link"}-${Date.now().toString(36)}`;

  const entry = {
    id,
    name,
    url,
    description: String(link.description || "").slice(0, 500),
    created_at: now,
    updated_at: now,
    tags,
    folder: folderId,
    preview: link.preview && typeof link.preview === "object" ? link.preview : {},
  };

  links.json.push(entry);
  await putFile(linksPath, links.json, `NDLR: add link "${name}" for ${designerSlug}`, links.sha);

  const tagsPath = "data/tags.json";
  const tagsFile = await getFile(tagsPath);
  if (tagsFile.json) {
    const merged = Array.from(new Set([...tagsFile.json, ...tags])).sort();
    if (merged.length !== tagsFile.json.length) {
      await putFile(tagsPath, merged, "NDLR: update suggested tags", tagsFile.sha);
    }
  }

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    const designer = data.json.designers.find((d) => d.slug === designerSlug);
    if (designer) {
      designer.links.push(entry);
      if (!designer.folders.some((f) => f.id === folderId)) {
        designer.folders.push({ id: folderId, name: folderId, emoji: "📁", color: "#3694FC" });
      }
    }
    data.json.suggestedTags = Array.from(new Set([...(data.json.suggestedTags || []), ...tags])).sort();
    await putFile(dataPath, data.json, `NDLR: add link "${name}" to site data`, data.sha);
  }

  return jsonResponse(200, { link: entry });
};
