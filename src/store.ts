import { connectMongo, Progress, Order, Partner } from './models';

export function usingMongo() {
  return Boolean(process.env.DATABASE_URL ?? process.env.MONGODB_URI);
}

export async function saveProgress(data: { childName: string; topicId: string; wordId: string; score: number; minutes: number }) {
  await connectMongo();
  return Progress.findOneAndUpdate(
    { childName: data.childName, topicId: data.topicId, wordId: data.wordId },
    { ...data, practicedAt: new Date() },
    { upsert: true, new: true, runValidators: true }
  ).lean();
}

export async function getProgress(childName: string) {
  await connectMongo();
  return Progress.find({ childName }).sort({ practicedAt: -1 }).lean();
}

export async function createOrder(data: { customer: unknown; items: unknown; total: number }) {
  await connectMongo();
  return Order.create(data);
}

export async function createPartner(data: { organization: string; contactName: string; phone: string; email?: string; studentCount?: number; note?: string }) {
  await connectMongo();
  return Partner.create(data);
}
