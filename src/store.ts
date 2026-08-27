import { Progress, Order, Partner } from './models';

const progressModel = Progress as any;
const orderModel = Order as any;
const partnerModel = Partner as any;

const memory = {
  progress: [
    { childName: 'Bé Mây', topicId: 'animals', wordId: 'fox', score: 92, minutes: 6, practicedAt: new Date(Date.now() - 86400000 * 2) },
    { childName: 'Bé Mây', topicId: 'animals', wordId: 'whale', score: 86, minutes: 5, practicedAt: new Date(Date.now() - 86400000) },
    { childName: 'Bé Mây', topicId: 'fruits', wordId: 'apple', score: 95, minutes: 7, practicedAt: new Date() }
  ],
  orders: [],
  partners: []
};

function usingMongo() {
  return progressModel.db.readyState === 1;
}

async function saveProgress(data) {
  const record = { ...data, practicedAt: new Date() };
  if (usingMongo()) {
    return progressModel.findOneAndUpdate(
      { childName: data.childName, topicId: data.topicId, wordId: data.wordId },
      { $set: record },
      { new: true, upsert: true, runValidators: true }
    ).lean();
  }
  const index = memory.progress.findIndex(item => item.childName === data.childName && item.topicId === data.topicId && item.wordId === data.wordId);
  if (index >= 0) memory.progress[index] = record;
  else memory.progress.push(record);
  return record;
}

async function getProgress(childName) {
  if (usingMongo()) return progressModel.find({ childName }).sort({ practicedAt: -1 }).lean();
  return memory.progress.filter(item => item.childName.toLowerCase() === childName.toLowerCase());
}

async function createOrder(data) {
  if (usingMongo()) return orderModel.create(data);
  const order = { _id: `DEMO-${String(memory.orders.length + 1).padStart(4, '0')}`, ...data, status: 'new', createdAt: new Date() };
  memory.orders.push(order);
  return order;
}

async function createPartner(data) {
  if (usingMongo()) return partnerModel.create(data);
  const partner = { _id: `PARTNER-${memory.partners.length + 1}`, ...data, status: 'new', createdAt: new Date() };
  memory.partners.push(partner);
  return partner;
}

export { usingMongo, saveProgress, getProgress, createOrder, createPartner };
