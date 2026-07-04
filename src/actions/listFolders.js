import { listObjects } from '../r2.js';

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

  async function listRecursive(prefix) {
    const prefixes = await collectPrefixes(prefix);
    for (const p of prefixes) {
      folders.push({ path: p, display: "/" + p });
      await listRecursive(p);
    }
  }

  const rootPrefixes = await collectPrefixes("");
  for (const p of rootPrefixes) {
    folders.push({ path: p, display: "/" + p });
    await listRecursive(p);
  }

  return new Response(JSON.stringify({ ok: true, folders }), {
    headers: { "content-type": "application/json" }
  });
}
