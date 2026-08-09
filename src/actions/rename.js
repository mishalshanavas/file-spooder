import { objectExists, getObject, putObject, deleteObjects, copyMetadata } from '../r2.js';
import { sanitizeName, isSafeObjectKey } from '../utils.js';

export async function handleRename({ bucket, data }) {
  const oldKey = data.key;
  const newName = data.newName;
  if (!isSafeObjectKey(oldKey) || !newName) return new Response("Missing params", { status: 400 });

  const nameCheck = sanitizeName(newName);
  if (!nameCheck.valid) return new Response(nameCheck.error, { status: 400 });

  const folder = oldKey.includes("/") ? oldKey.slice(0, oldKey.lastIndexOf("/") + 1) : "";
  const newKey = folder + nameCheck.sanitized;

  if (newKey === oldKey) {
    return new Response(JSON.stringify({ ok: true, newKey, noop: true }), {
      headers: { "content-type": "application/json" }
    });
  }

  if (await objectExists(bucket, newKey)) {
    return new Response("Destination already exists", { status: 409 });
  }

  const obj = await getObject(bucket, oldKey);
  if (!obj) return new Response("Not found", { status: 404 });

  const ct = obj.httpMetadata?.contentType || "application/octet-stream";
  await putObject(bucket, newKey, obj.body, ct, copyMetadata(obj));
  await deleteObjects(bucket, oldKey);

  return new Response(JSON.stringify({ ok: true, newKey }), {
    headers: { "content-type": "application/json" }
  });
}
