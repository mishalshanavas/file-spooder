/**
 * R2 storage operations for file-spooder.
 * Thin wrappers around the Cloudflare R2 binding that normalize the API
 * and remove redundant patterns.
 */

/**
 * Check if an object exists in R2.
 * Uses head() which is efficient (no body download).
 * @param {object} bucket - R2 bucket binding
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function objectExists(bucket, key) {
  const head = await bucket.head(key);
  return !!head;
}

/**
 * Store an object in R2 with content type metadata.
 * @param {object} bucket - R2 bucket binding
 * @param {string} key
 * @param {ArrayBuffer|string|ReadableStream} body
 * @param {string} contentType
 * @param {object} [sourceMetadata] - HTTP/custom metadata to retain when copying.
 * @returns {Promise<void>}
 */
export async function putObject(bucket, key, body, contentType = "application/octet-stream", sourceMetadata = {}) {
  const options = {
    ...sourceMetadata,
    httpMetadata: { ...(sourceMetadata.httpMetadata || {}), contentType }
  };
  if (!sourceMetadata.customMetadata) delete options.customMetadata;
  if (!sourceMetadata.storageClass) delete options.storageClass;
  await bucket.put(key, body, options);
}

/**
 * Retrieve an object from R2.
 * @param {object} bucket - R2 bucket binding
 * @param {string} key
 * @returns {Promise<R2Object|null>}
 */
export async function getObject(bucket, key, options) {
  return bucket.get(key, options);
}

/** Retrieve object metadata without downloading its body. */
export async function headObject(bucket, key) {
  return bucket.head(key);
}

/** Return metadata which can safely be carried forward during an R2 copy. */
export function copyMetadata(object) {
  return {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
    storageClass: object.storageClass
  };
}

/**
 * Delete one or more objects from R2.
 * @param {object} bucket - R2 bucket binding
 * @param {string|string[]} keys
 * @returns {Promise<void>}
 */
export async function deleteObjects(bucket, keys) {
  await bucket.delete(keys);
}

/**
 * List objects in R2 with optional prefix, delimiter, and cursor.
 * @param {object} bucket - R2 bucket binding
 * @param {object} [options]
 * @param {string} [options.prefix]
 * @param {string} [options.delimiter]
 * @param {string} [options.cursor]
 * @returns {Promise<R2Objects>}
 */
export async function listObjects(bucket, options = {}) {
  return bucket.list(options);
}
