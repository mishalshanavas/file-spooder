import { objectExists, getObject, putObject } from '../r2.js';

export async function handleCopyFile({ bucket, data }) {
  const sourceKey = data.key;
  const destFolder = data.destFolder || "";
  if (!sourceKey) return new Response("No source key", { status: 400 });
  if (destFolder.includes("..")) return new Response("Invalid destination", { status: 400 });

  const obj = await getObject(bucket, sourceKey);
  if (!obj) return new Response("Source not found", { status: 404 });

  const fileName = sourceKey.split("/").pop();
  const destKey = destFolder + fileName;

  if (await objectExists(bucket, destKey)) {
    return new Response("Destination already exists", { status: 409 });
  }

  const arrayBuffer = await obj.arrayBuffer();
  const ct = obj.httpMetadata?.contentType || "application/octet-stream";

  await putObject(bucket, destKey, arrayBuffer, ct);

  return new Response(JSON.stringify({ ok: true, destKey }), {
    headers: { "content-type": "application/json" }
  });
}
