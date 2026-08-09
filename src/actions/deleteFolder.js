import { deleteObjects, listObjects } from '../r2.js';
import { isSafeFolderPrefix } from '../utils.js';

export async function handleDeleteFolder({ bucket, data }) {
  const folderPrefix = data.prefix;
  if (!folderPrefix || !isSafeFolderPrefix(folderPrefix)) return new Response("Invalid prefix", { status: 400 });

  let delCursor = undefined;
  do {
    const list = await listObjects(bucket, { prefix: folderPrefix, cursor: delCursor });
    const keys = (list.objects || []).map(o => o.key);
    if (keys.length > 0) await deleteObjects(bucket, keys);
    delCursor = list.truncated ? list.cursor : undefined;
  } while (delCursor);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });
}
