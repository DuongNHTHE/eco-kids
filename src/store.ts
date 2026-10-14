import { connectMongo, Progress, Order, Partner } from './models';
import { generateOrderCode } from './order-payment';

export function usingMongo() {
  return Boolean(process.env.DATABASE_URL ?? process.env.MONGODB_URI);
}

export async function saveProgress(data: { childId: string; topicId: string; wordId: string; score: number; minutes: number }) {
  await connectMongo();
  return Progress.findOneAndUpdate(
    { childId: data.childId, topicId: data.topicId, wordId: data.wordId },
    { ...data, practicedAt: new Date() },
    { upsert: true, new: true, runValidators: true }
  ).lean();
}

export async function getProgress(childId: string) {
  await connectMongo();
  return Progress.find({ childId }).sort({ practicedAt: -1 }).lean();
}

export async function createOrder(data: { user_id: string; customer: unknown; items: unknown; total: number }) {
  await connectMongo();
  await Order.collection.createIndex({ orderCode: 1 }, { unique: true, sparse: true });
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Order.create({ ...data, orderCode: generateOrderCode() });
    } catch (error: any) {
      const orderCodeCollision = error?.code === 11000
        && (error?.keyPattern?.orderCode || error?.keyValue?.orderCode);
      if (!orderCodeCollision || attempt === 4) throw error;
    }
  }
  throw new Error('Could not allocate a unique order code.');
}

export async function createPartner(data: { organization: string; contactName: string; phone: string; email?: string; studentCount?: number; note?: string }) {
  await connectMongo();
  return Partner.create(data);
}
