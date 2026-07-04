import { GITHUB_BLOB_REGEX, LINK_EXTENSION } from '../config.js';
import { putObject } from '../r2.js';
import { sanitizeName, corsHeaders } from '../utils.js';

export async function handleCreateLink({ bucket, path, data }) {
  let targetUrl = data.url;
  const linkName = data.name || "link";
  if (!targetUrl) return new Response("No URL provided", { status: 400 });

  const nameCheck = sanitizeName(linkName);
  if (!nameCheck.valid) return new Response(nameCheck.error, { status: 400 });

  const match = targetUrl.match(GITHUB_BLOB_REGEX);
  if (match) {
    targetUrl = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`;
  }

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  const currentPrefix = path.endsWith("/") ? decodeURIComponent(path.slice(1)) : "";
  const key = currentPrefix + nameCheck.sanitized + LINK_EXTENSION;

  await putObject(bucket, key, targetUrl, "text/plain");

  return new Response("OK", { status: 200, headers: corsHeaders() });
}
