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
 * @returns {Promise<void>}
 */
export async function putObject(bucket, key, body, contentType = "application/octet-stream") {
  await bucket.put(key, body, {
    httpMetadata: { contentType }
  });
}

/**
 * Retrieve an object from R2.
 * @param {object} bucket - R2 bucket binding
 * @param {string} key
 * @returns {Promise<R2Object|null>}
 */
export async function getObject(bucket, key) {
  return bucket.get(key);
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
