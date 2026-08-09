import { listObjects } from '../r2.js';
import { MAX_FOLDER_CHOICES } from '../config.js';

export async function handleListFolders({ bucket }) {
  const folders = [{ path: "", display: "/ (Root)" }];

  async function collectPrefixes(prefix = "") {
    const out = [];
    let cursor = undefined;
    do {
      const list = await listObjects(bucket, { prefix, delimiter: "/", cursor });
      const prefixes = list.delimitedPrefixes || [];
      for (const p of prefixes) out.push(p);
      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);
    return out;
  }

  // An iterative traversal avoids a call-stack overflow on deeply nested paths.
  const pending = [""];
  try {
    while (pending.length) {
      const parent = pending.shift();
      const prefixes = await collectPrefixes(parent);
      for (const p of prefixes) {
        if (folders.length >= MAX_FOLDER_CHOICES) {
          return new Response(`Too many folders to display (limit: ${MAX_FOLDER_CHOICES})`, { status: 413 });
        }
        folders.push({ path: p, display: "/" + p });
        pending.push(p);
      }
    }
  } catch (error) {
    return new Response("Failed to list folders", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, folders }), {
    headers: { "content-type": "application/json" }
  });
}
