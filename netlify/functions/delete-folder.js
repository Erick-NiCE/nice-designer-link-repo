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
  if (!isValidSlug(designerSlug)) return jsonResponse(400, { error: "Invalid designerSlug" });
  if (typeof folderId !== "string" || !folderId) return jsonResponse(400, { error: "folderId is required" });
  if (folderId === "uncategorized") return jsonResponse(400, { error: "Can't delete the Uncategorized folder" });

  const metaPath = `designers/${designerSlug}/meta.json`;
  const meta = await getFile(metaPath);
  if (!meta.json) return jsonResponse(404, { error: `Designer "${designerSlug}" not found` });

  const before = meta.json.folders.length;
  meta.json.folders = meta.json.folders.filter((f) => f.id !== folderId);
  if (meta.json.folders.length === before) return jsonResponse(404, { error: `Folder "${folderId}" not found` });
  if (!meta.json.folders.some((f) => f.id === "uncategorized")) {
    meta.json.folders.push({ id: "uncategorized", name: "Uncategorized", emoji: "📁", color: "#3694FC" });
  }

  await putFile(metaPath, meta.json, `NDLR: delete folder "${folderId}" for ${designerSlug}`, meta.sha);

  const linksPath = `designers/${designerSlug}/links.json`;
  const links = await getFile(linksPath);
  let movedCount = 0;
  if (links.json) {
    links.json.forEach((l) => {
      if (l.folder === folderId) {
        l.folder = "uncategorized";
        l.updated_at = new Date().toISOString();
        movedCount++;
      }
    });
    if (movedCount > 0) {
      await putFile(linksPath, links.json, `NDLR: move ${movedCount} link(s) out of deleted folder "${folderId}"`, links.sha);
    }
  }

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    const designer = data.json.designers.find((d) => d.slug === designerSlug);
    if (designer) {
      designer.folders = meta.json.folders;
      designer.links.forEach((l) => {
        if (l.folder === folderId) l.folder = "uncategorized";
      });
    }
    await putFile(dataPath, data.json, `NDLR: delete folder "${folderId}" from site data`, data.sha);
  }

  return jsonResponse(200, { deleted: folderId, movedLinks: movedCount, folders: meta.json.folders });
};
