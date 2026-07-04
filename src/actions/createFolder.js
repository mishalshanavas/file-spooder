import { FOLDER_SENTINEL } from '../config.js';
import { putObject } from '../r2.js';
import { sanitizeName } from '../utils.js';

export async function handleCreateFolder({ bucket, path, data }) {
  const folderName = data.name;
  if (!folderName) return new Response("No folder name", { status: 400 });

  const nameCheck = sanitizeName(folderName);
  if (!nameCheck.valid) {
    return new Response(nameCheck.error, { status: 400 });
  }

  const currentPrefix = path.endsWith("/") ? decodeURIComponent(path.slice(1)) : "";
  const key = currentPrefix + nameCheck.sanitized + "/" + FOLDER_SENTINEL;

  await putObject(bucket, key, "", "text/plain");

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });
}
