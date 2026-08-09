import { objectExists, getObject, putObject, deleteObjects, listObjects, copyMetadata } from '../r2.js';
import { isSafeFolderPrefix } from '../utils.js';

async function forEachObject(bucket, prefix, callback) {
  let cursor;
  do {
    const list = await listObjects(bucket, { prefix, cursor });
    for (const object of list.objects || []) await callback(object);
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
}

export async function handleRenameFolder({ bucket, data }) {
  const oldPrefix = data.oldPrefix;
  const newPrefix = data.newPrefix;
  if (!oldPrefix || !newPrefix || !isSafeFolderPrefix(oldPrefix) || !isSafeFolderPrefix(newPrefix)) {
    return new Response('Invalid folder path', { status: 400 });
  }

  if (oldPrefix === newPrefix) {
    return new Response(JSON.stringify({ ok: true, noop: true }), {
      headers: { 'content-type': 'application/json' }
    });
  }
  if (newPrefix.startsWith(oldPrefix)) {
    return new Response('Cannot move a folder into itself', { status: 400 });
  }

  // Validate every destination before changing anything.
  let sourceCount = 0;
  try {
    await forEachObject(bucket, oldPrefix, async (object) => {
      sourceCount++;
      const newKey = newPrefix + object.key.slice(oldPrefix.length);
      if (await objectExists(bucket, newKey)) throw new Error(`CONFLICT:${newKey}`);
    });
  } catch (error) {
    const message = error.message || 'unknown error';
    return new Response(message.startsWith('CONFLICT:')
      ? `Destination already exists: ${message.slice('CONFLICT:'.length)}`
      : 'Could not validate the destination folder',
    { status: message.startsWith('CONFLICT:') ? 409 : 500 });
  }

  if (sourceCount === 0) return new Response('Source folder not found', { status: 404 });

  // Copy every object first. The source stays intact if any copy fails, which
  // prevents the old behaviour where a folder could be split across two paths.
  const copyErrors = [];
  await forEachObject(bucket, oldPrefix, async (object) => {
    const newKey = newPrefix + object.key.slice(oldPrefix.length);
    try {
      const source = await getObject(bucket, object.key);
      if (!source) throw new Error('source disappeared');
      await putObject(bucket, newKey, source.body,
        source.httpMetadata?.contentType || 'application/octet-stream', copyMetadata(source));
    } catch (error) {
      copyErrors.push({ key: object.key, error: error.message || 'copy failed' });
    }
  });

  if (copyErrors.length) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Folder was not renamed; original files were kept.',
      failed: copyErrors.slice(0, 20)
    }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  // Delete only after all copies succeeded. A deletion failure leaves duplicate
  // data, never missing data, and is reported instead of silently succeeding.
  const deleteErrors = [];
  await forEachObject(bucket, oldPrefix, async (object) => {
    try { await deleteObjects(bucket, object.key); }
    catch (error) { deleteErrors.push(object.key); }
  });

  if (deleteErrors.length) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Files were copied, but some originals could not be deleted.',
      failed: deleteErrors.slice(0, 20)
    }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' }
  });
}
