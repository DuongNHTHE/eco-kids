import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePronunciationScore, resolveWordModel } from '../app/learn/page';
import { GET as health } from '../app/api/health/route';
import { GET as getTopics } from '../app/api/topics/route';
import { GET as getProducts } from '../app/api/products/route';
import { GET as getProgress } from '../app/api/progress/[childName]/route';
import { POST as saveProgress } from '../app/api/progress/route';
import { POST as createOrder } from '../app/api/orders/route';

test('extracts pronunciation score from Azure assessment payload', () => {
  const score = normalizePronunciationScore({
    NBest: [{
      PronunciationAssessment: { AccuracyScore: 94.2 }
    }]
  });
  assert.equal(score, 94);
});

test('uses saved 3d model url when present and falls back to shape icon otherwise', () => {
  const urlModel = resolveWordModel({ modelUrl: 'https://example.com/model.glb', shape: 'fox' });
  const iconModel = resolveWordModel({ shape: 'whale' });

  assert.equal(urlModel.type, 'iframe');
  assert.equal(urlModel.src, 'https://example.com/model.glb');
  assert.equal(iconModel.type, 'emoji');
  assert.equal(iconModel.icon, '🐋');
});

test('serves health, topics, and products from Next API routes', async () => {
  assert.equal((await health()).status, 200);
  assert.equal((await getTopics()).json instanceof Function, true);
  const topics = await (await getTopics()).json();
  const products = await (await getProducts()).json();
  assert.equal(topics.length, 3);
  assert.equal(topics[0].words.length, 3);
  assert.equal(products.length, 3);
});

test('saves progress and dashboard route reads it back', async () => {
  const childName = 'ApiTestChild';
  const response = await saveProgress(new Request('http://localhost/api/progress', { method: 'POST', body: JSON.stringify({ childName, topicId: 'fruits', wordId: 'apple', score: 93, minutes: 4 }) }));
  assert.equal(response.status, 201);
  const dashboard = await getProgress(new Request('http://localhost/api/progress/ApiTestChild'), { params: Promise.resolve({ childName }) });
  const result = await dashboard.json();
  assert.equal(result.stats.wordsLearned, 1);
  assert.equal(result.stats.averageScore, 93);
});

test('validates orders and calculates total in Next API route', async () => {
  const invalid = await createOrder(new Request('http://localhost/api/orders', { method: 'POST', body: JSON.stringify({}) }));
  assert.equal(invalid.status, 400);
  const valid = await createOrder(new Request('http://localhost/api/orders', { method: 'POST', body: JSON.stringify({ customer: { name: 'Test', phone: '0901', address: 'HCM' }, items: [{ productId: 'explorer', quantity: 2 }] }) }));
  const result = await valid.json();
  assert.equal(valid.status, 201);
  assert.equal(result.total, 1798000);
});
