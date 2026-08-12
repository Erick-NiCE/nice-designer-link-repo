const { isSafePublicUrl, jsonResponse } = require("./_github");

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

exports.handler = async function (event) {
  const url = (event.queryStringParameters || {}).url;
  if (!url || !isSafePublicUrl(url)) {
    return jsonResponse(400, { error: "A public http(s) url query param is required" });
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return jsonResponse(400, { error: "Invalid url" });
  }
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NDLR-LinkPreview/1.0)" },
    });
    const html = (await res.text()).slice(0, 200000);

    const title =
      extract(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      extract(html, /<title[^>]*>([^<]+)<\/title>/i) ||
      hostname;

    const image =
      extract(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      extract(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      "";

    const description =
      extract(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      "";

    return jsonResponse(200, { title, image, favicon, description });
  } catch {
    return jsonResponse(200, { title: hostname, image: "", favicon, description: "" });
  }
};
