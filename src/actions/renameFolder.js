import { objectExists, getObject, putObject, deleteObjects, listObjects } from '../r2.js';

export async function handleRenameFolder({ bucket, data }) {
  const oldPrefix = data.oldPrefix;
  const newPrefix = data.newPrefix;
  if (!oldPrefix || !newPrefix) return new Response("Missing params", { status: 400 });

  // Prevent path traversal
  if (oldPrefix.includes("..") || newPrefix.includes("..")) {
    return new Response("Invalid path", { status: 400 });
  }

  if (oldPrefix === newPrefix) {
    return new Response(JSON.stringify({ ok: true, noop: true }), {
      headers: { "content-type": "application/json" }
    });
  }

  // First pass: check all destinations exist
  let cursor = undefined;
  do {
    const list = await listObjects(bucket, { prefix: oldPrefix, cursor });
    for (const obj of (list.objects || [])) {
      const newKey = newPrefix + obj.key.slice(oldPrefix.length);
      if (await objectExists(bucket, newKey)) {
        return new Response("Destination already exists: " + newKey, { status: 409 });
      }
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  // Second pass: copy and delete
  cursor = undefined;
  const errors = [];
  do {
    const list = await listObjects(bucket, { prefix: oldPrefix, cursor });
    for (const obj of (list.objects || [])) {
      const newKey = newPrefix + obj.key.slice(oldPrefix.length);
      try {
        const src = await getObject(bucket, obj.key);
        if (src) {
          const buf = await src.arrayBuffer();
          await putObject(bucket, newKey, buf, src.httpMetadata?.contentType || "application/octet-stream");
          await deleteObjects(bucket, obj.key);
        }
      } catch (e) {
        errors.push(obj.key);
      }
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  if (errors.length > 0) {
    return new Response("Partial failure: " + errors.join(", "), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });
}
