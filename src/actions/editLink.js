import { GITHUB_BLOB_REGEX, LINK_EXTENSION } from '../config.js';
import { putObject } from '../r2.js';

export async function handleEditLink({ bucket, data }) {
  const key = data.key;
  let newUrl = data.url;
  if (!key || !newUrl) return new Response("Missing params", { status: 400 });
  if (!key.endsWith(LINK_EXTENSION)) return new Response("Not a link file", { status: 400 });

  const match = newUrl.match(GITHUB_BLOB_REGEX);
  if (match) {
    newUrl = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`;
  }

  if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
    newUrl = "https://" + newUrl;
  }

  await putObject(bucket, key, newUrl, "text/plain");

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });
}
