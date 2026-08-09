import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../worker.js';
import { handleCopyFile } from '../src/actions/copyFile.js';
import { requireAuth } from '../src/auth.js';

test('multipart part requests retain their FormData body', async () => {
  const uploaded = [];
  const bucket = {
    resumeMultipartUpload(key, uploadId) {
      assert.equal(key, 'uploads/big.bin');
      assert.equal(uploadId, 'upload-1');
      return {
        async uploadPart(partNumber, body) {
          uploaded.push({ partNumber, text: await new Response(body).text() });
          return { etag: 'etag-1' };
        }
      };
    }
  };
  const form = new FormData();
  form.set('uploadId', 'upload-1');
  form.set('key', 'uploads/big.bin');
  form.set('partNumber', '1');
  form.set('chunk', new Blob(['chunk data']));
  const request = new Request('https://files.example/uploads/?action=multipartPart', {
    method: 'POST', headers: { 'x-password': 'secret' }, body: form
  });

  const response = await worker.fetch(request, { R2_BUCKET: bucket, ADMIN_PASSWORD: 'secret' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, partNumber: 1, etag: 'etag-1' });
  assert.deepEqual(uploaded, [{ partNumber: 1, text: 'chunk data' }]);
});

test('multipart start derives a safe decoded key from the current folder', async () => {
  let created;
  const bucket = {
    async head() { return null; },
    async createMultipartUpload(key, options) {
      created = { key, options };
      return { uploadId: 'upload-1' };
    }
  };
  const request = new Request('https://files.example/folder%20name/?action=multipartStart', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-password': 'secret' },
    body: JSON.stringify({ name: 'big file.bin', size: 100, contentType: 'application/octet-stream' })
  });

  const response = await worker.fetch(request, { R2_BUCKET: bucket, ADMIN_PASSWORD: 'secret' });
  assert.equal(response.status, 200);
  assert.deepEqual(created, {
    key: 'folder name/big file.bin',
    options: { httpMetadata: { contentType: 'application/octet-stream' } }
  });
});

test('copy streams an object to R2 without buffering it in memory', async () => {
  const source = {
    body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('large file')); controller.close(); } }),
    httpMetadata: { contentType: 'text/plain', cacheControl: 'public, max-age=60' },
    customMetadata: { owner: 'test' },
    storageClass: 'Standard',
    arrayBuffer() { throw new Error('copy must not buffer the complete file'); }
  };
  let put;
  const bucket = {
    async head() { return null; },
    async get(key) { assert.equal(key, 'source.txt'); return source; },
    async put(key, body, options) { put = { key, body, options }; }
  };

  const response = await handleCopyFile({ bucket, data: { key: 'source.txt', destFolder: 'archive/' } });
  assert.equal(response.status, 200);
  assert.equal(put.key, 'archive/source.txt');
  assert.equal(put.body, source.body);
  assert.deepEqual(put.options, {
    httpMetadata: { contentType: 'text/plain', cacheControl: 'public, max-age=60' },
    customMetadata: { owner: 'test' },
    storageClass: 'Standard'
  });
});

test('authentication rejects deployments with no configured password', () => {
  const request = new Request('https://files.example/', { headers: { 'x-password': '' } });
  assert.equal(requireAuth(request, {}).status, 401);
});

test('file serving honours a valid HTTP byte range', async () => {
  let getOptions;
  const bucket = {
    async head(key) { assert.equal(key, 'movie.mp4'); return { size: 10 }; },
    async get(key, options) {
      assert.equal(key, 'movie.mp4');
      getOptions = options;
      return {
        body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('2345')); controller.close(); } }),
        size: 10,
        httpEtag: 'etag',
        httpMetadata: { contentType: 'video/mp4' }
      };
    },
    async list() { return { objects: [], delimitedPrefixes: [] }; }
  };
  const request = new Request('https://files.example/movie.mp4', { headers: { range: 'bytes=2-5' } });

  const response = await worker.fetch(request, { R2_BUCKET: bucket });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal(response.headers.get('content-length'), '4');
  assert.deepEqual(getOptions, { range: { offset: 2, length: 4 } });
  assert.equal(await response.text(), '2345');
});

test('file serving rejects an unsatisfiable HTTP byte range', async () => {
  const bucket = {
    async head() { return { size: 10 }; },
    async get() { throw new Error('get should not run'); }
  };
  const response = await worker.fetch(new Request('https://files.example/movie.mp4', {
    headers: { range: 'bytes=20-30' }
  }), { R2_BUCKET: bucket });
  assert.equal(response.status, 416);
  assert.equal(response.headers.get('content-range'), 'bytes */10');
});
