const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');

let server;
let baseUrl;

test.before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => new Promise(resolve => server.close(resolve)));

test('serves the API health endpoint', async () => {
  const response = await fetch(baseUrl + '/api/health');
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
});

test('returns topics and products', async () => {
  const topics = await fetch(baseUrl + '/api/topics').then(response => response.json());
  const products = await fetch(baseUrl + '/api/products').then(response => response.json());
  assert.equal(topics.length, 3);
  assert.equal(topics[0].words.length, 3);
  assert.equal(products.length, 3);
});

test('saves progress and returns dashboard stats', async () => {
  const childName = 'Bé Kiểm Thử';
  const saved = await fetch(baseUrl + '/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childName, topicId: 'fruits', wordId: 'apple', score: 93, minutes: 4 })
  });
  assert.equal(saved.status, 201);
  const dashboard = await fetch(baseUrl + '/api/progress/' + encodeURIComponent(childName)).then(response => response.json());
  assert.equal(dashboard.stats.wordsLearned, 1);
  assert.equal(dashboard.stats.averageScore, 93);
});

test('validates orders and calculates price on the server', async () => {
  const invalid = await fetch(baseUrl + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(invalid.status, 400);
  const valid = await fetch(baseUrl + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer: { name: 'Test', phone: '0901', address: 'HCM' }, items: [{ productId: 'explorer', quantity: 2 }] })
  });
  const result = await valid.json();
  assert.equal(valid.status, 201);
  assert.equal(result.total, 1798000);
});
