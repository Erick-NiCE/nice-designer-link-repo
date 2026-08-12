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
  const linkId = body.linkId;
  if (!isValidSlug(designerSlug)) return jsonResponse(400, { error: "Invalid designerSlug" });
  if (typeof linkId !== "string" || !linkId) return jsonResponse(400, { error: "linkId is required" });

  const linksPath = `designers/${designerSlug}/links.json`;
  const links = await getFile(linksPath);
  if (!links.json) return jsonResponse(404, { error: `Designer "${designerSlug}" not found` });

  const before = links.json.length;
  links.json = links.json.filter((l) => l.id !== linkId);
  if (links.json.length === before) return jsonResponse(404, { error: `Link "${linkId}" not found` });

  await putFile(linksPath, links.json, `NDLR: delete link "${linkId}" for ${designerSlug}`, links.sha);

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    const designer = data.json.designers.find((d) => d.slug === designerSlug);
    if (designer) designer.links = designer.links.filter((l) => l.id !== linkId);
    await putFile(dataPath, data.json, `NDLR: delete link "${linkId}" from site data`, data.sha);
  }

  return jsonResponse(200, { deleted: linkId });
};
