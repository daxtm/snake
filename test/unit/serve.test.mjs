import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createApp, resolvePublicPath } from '../../scripts/serve.mjs';

let server;
let baseURL;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('static server', () => {
  it('serves index.html at / with the HTML content type', async () => {
    const res = await fetch(baseURL + '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const body = await res.text();
    assert.match(body, /<title>Snake<\/title>/);
  });

  it('serves styles.css with the CSS content type', async () => {
    const res = await fetch(baseURL + '/styles.css');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/css/);
  });

  it('serves browser modules with the JavaScript content type', async () => {
    for (const file of ['game.mjs', 'engine.mjs']) {
      const res = await fetch(baseURL + '/' + file);
      assert.equal(res.status, 200, file);
      assert.match(res.headers.get('content-type'), /text\/javascript/, file);
    }
  });

  it('answers 404 for missing files', async () => {
    const res = await fetch(baseURL + '/no-such-file.html');
    assert.equal(res.status, 404);
  });

  it('refuses paths that escape the public root', async () => {
    for (const target of ['/../package.json', '/..%2fpackage.json', '/%2e%2e/AGENTS.md', '/....//package.json']) {
      const res = await fetch(baseURL + target);
      assert.equal(res.status, 404, target);
    }
    assert.equal(resolvePublicPath('/..%2fpackage.json'), null);
    assert.equal(resolvePublicPath('/..%2F..%2Fpackage.json'), null);
  });
});
