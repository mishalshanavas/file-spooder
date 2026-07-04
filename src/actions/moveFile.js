import { objectExists, getObject, putObject, deleteObjects } from '../r2.js';

export async function handleMoveFile({ bucket, data }) {
  const sourceKey = data.key;
  const destFolder = data.destFolder || "";
  if (!sourceKey) return new Response("No source key", { status: 400 });
  if (destFolder.includes("..")) return new Response("Invalid destination", { status: 400 });

  const obj = await getObject(bucket, sourceKey);
  if (!obj) return new Response("Source not found", { status: 404 });

  const fileName = sourceKey.split("/").pop();
  const destKey = destFolder + fileName;

  if (destKey === sourceKey) {
    return new Response(JSON.stringify({ ok: true, destKey, noop: true }), {
      headers: { "content-type": "application/json" }
    });
  }

  if (await objectExists(bucket, destKey)) {
    return new Response("Destination already exists", { status: 409 });
  }

  const arrayBuffer = await obj.arrayBuffer();
  const ct = obj.httpMetadata?.contentType || "application/octet-stream";

  await putObject(bucket, destKey, arrayBuffer, ct);
  await deleteObjects(bucket, sourceKey);

  return new Response(JSON.stringify({ ok: true, destKey }), {
    headers: { "content-type": "application/json" }
  });
}
