require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { topics, products } = require('./data');
const store = require('./store');

const app = express();
const port = Number(process.env.PORT) || 1111;
const host = process.env.HOST || '127.0.0.1';

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ ok: true, database: store.usingMongo() ? 'mongodb' : 'demo-memory' }));
app.get('/api/topics', (_req, res) => res.json(topics));
app.get('/api/topics/:id', (req, res) => {
  const topic = topics.find(item => item.id === req.params.id);
  if (!topic) return res.status(404).json({ message: 'Không tìm thấy chủ đề.' });
  res.json(topic);
});
app.get('/api/products', (_req, res) => res.json(products));

app.get('/api/progress/:childName', async (req, res, next) => {
  try {
    const records = await store.getProgress(req.params.childName);
    const totalMinutes = records.reduce((sum, item) => sum + (item.minutes || 0), 0);
    const averageScore = records.length ? Math.round(records.reduce((sum, item) => sum + (item.score || 0), 0) / records.length) : 0;
    res.json({ childName: req.params.childName, records, stats: { wordsLearned: records.length, totalMinutes, averageScore, streak: Math.min(7, Math.max(1, records.length)) } });
  } catch (error) { next(error); }
});

app.post('/api/progress', async (req, res, next) => {
  try {
    const { childName, topicId, wordId, score, minutes } = req.body;
    if (!childName || !topicId || !wordId) return res.status(400).json({ message: 'Thiếu thông tin bài học.' });
    const saved = await store.saveProgress({ childName, topicId, wordId, score: Number(score) || 0, minutes: Number(minutes) || 1 });
    res.status(201).json(saved);
  } catch (error) { next(error); }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const { customer, items } = req.body;
    if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'Vui lòng nhập đủ thông tin giao hàng.' });
    }
    const normalizedItems = items.map(item => {
      const product = products.find(productItem => productItem.id === item.productId);
      if (!product) return null;
      const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      return { productId: product.id, name: product.name, price: product.price, quantity };
    }).filter(Boolean);
    if (!normalizedItems.length) return res.status(400).json({ message: 'Sản phẩm không hợp lệ.' });
    const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await store.createOrder({ customer, items: normalizedItems, total });
    res.status(201).json({ message: 'Đặt hàng thành công!', orderId: order._id, total });
  } catch (error) { next(error); }
});

app.post('/api/partners', async (req, res, next) => {
  try {
    const { organization, contactName, phone } = req.body;
    if (!organization || !contactName || !phone) return res.status(400).json({ message: 'Vui lòng nhập đủ thông tin liên hệ.' });
    const partner = await store.createPartner(req.body);
    res.status(201).json({ message: 'ECO-KIDS đã nhận đăng ký. Đội ngũ sẽ liên hệ sớm!', id: partner._id });
  } catch (error) { next(error); }
});

app.use('/api', (_req, res) => res.status(404).json({ message: 'API không tồn tại.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' });
});

async function start() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eco-kids';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log('✓ MongoDB connected');
  } catch (_error) {
    console.warn('! MongoDB unavailable — running with demo data');
  }
  app.listen(port, host, () => console.log(`✓ ECO-KIDS running at http://${host}:${port}`));
}

if (require.main === module) start();

module.exports = app;
export {};
