import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

const post = (url, password = 'incorrect') => new Request(url, { method: 'POST', headers: { 'x-password': password, 'CF-Connecting-IP': '192.0.2.10' } });
test('HTTP credential requests are rejected before authentication or storage', async () => {
  const r = await worker.fetch(post('http://files.example/?action=delete'), {});
  assert.equal(r.status, 403);
});
test('HTTP navigation redirects to HTTPS preserving the path', async () => {
  const r = await worker.fetch(new Request('http://files.example/folder/?a=1'), {});
  assert.equal(r.status, 308);
  assert.equal(r.headers.get('location'), 'https://files.example/folder/?a=1');
});
test('failed credentials are throttled by the trusted connecting IP', async () => {
  const r = await worker.fetch(post('https://files.example/?action=delete'), {
    ADMIN_PASSWORD: 'secret', AUTH_FAILURE_LIMITER: { async limit({key}) { assert.equal(key, '192.0.2.10'); return { success: false }; } }
  });
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('retry-after'), '60');
});
test('admin mutations fail closed when throttling is unavailable', async () => {
  for (const env of [{}, { ADMIN_LIMITER: { async limit() { throw new Error('unavailable'); } } }]) {
    const r = await worker.fetch(post('https://files.example/?action=delete', 'secret'), { ADMIN_PASSWORD: 'secret', ...env });
    assert.equal(r.status, 503);
  }
});
for (const type of ['text/html', 'image/svg+xml', 'application/xhtml+xml']) {
  test(`active content ${type} downloads in a sandbox`, async () => {
    const r = await worker.fetch(new Request('https://files.example/untrusted'), { R2_BUCKET: {
      async get() { return { body: '<script>bad()</script>', size: 22, httpMetadata: { contentType: type } }; }
    } });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-disposition'), /^attachment;/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.match(r.headers.get('content-security-policy'), /sandbox/);
  });
}
