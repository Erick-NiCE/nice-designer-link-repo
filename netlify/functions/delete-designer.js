const { getFile, deleteFile, putFile, isValidSlug, jsonResponse } = require("./_github");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const slug = body.slug;
  if (!isValidSlug(slug)) return jsonResponse(400, { error: "Invalid slug" });

  const metaPath = `designers/${slug}/meta.json`;
  const linksPath = `designers/${slug}/links.json`;

  const meta = await getFile(metaPath);
  if (!meta.json) return jsonResponse(404, { error: `Designer "${slug}" not found` });

  await deleteFile(metaPath, `NDLR: delete designer ${slug}`, meta.sha);

  const links = await getFile(linksPath);
  if (links.json) await deleteFile(linksPath, `NDLR: delete links.json for ${slug}`, links.sha);

  const dataPath = "site/data.json";
  const data = await getFile(dataPath);
  if (data.json) {
    data.json.designers = data.json.designers.filter((d) => d.slug !== slug);
    await putFile(dataPath, data.json, `NDLR: remove designer ${slug} from site data`, data.sha);
  }

  return jsonResponse(200, { deleted: slug });
};
