import { randomBytes } from 'node:crypto';
import { LearningCode } from './models';

export async function ensureLearningCode(topicId: string, wordId: string) {
  const existing: any = await LearningCode.findOne({ topicId, wordId }).lean();
  if (existing) {
    if (!existing.isActive) await LearningCode.updateOne({ _id: existing._id }, { isActive: true });
    return String(existing.code);
  }

  const code = randomBytes(8).toString('hex').toUpperCase();
  try {
    const learningCode = await LearningCode.create({ code, topicId, wordId, isActive: true });
    return String(learningCode.code);
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    const concurrentCode: any = await LearningCode.findOne({ topicId, wordId }).lean();
    if (!concurrentCode) throw error;
    if (!concurrentCode.isActive) await LearningCode.updateOne({ _id: concurrentCode._id }, { isActive: true });
    return String(concurrentCode.code);
  }
}

export async function deactivateLearningCodes(topicId: string, wordId: string) {
  await LearningCode.updateMany({ topicId, wordId, isActive: true }, { isActive: false });
}