import { saveProgress } from '../../../src/store';
import { writeAuditLog } from '../../../src/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { Child, connectMongo } from '../../../src/models';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, topicId, wordId, score, minutes } = body;
    if (!childId || !topicId || !wordId) return Response.json({ message: 'Thiếu thông tin bài học.' }, { status: 400 });
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;
    if (!user?.id || user.role !== 'PARENT') return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });
    if (!mongoose.Types.ObjectId.isValid(String(childId))) {
      return Response.json({ message: 'childId không hợp lệ.' }, { status: 400 });
    }
    await connectMongo();
    const child: any = await Child.findOne({ _id: childId, parentId: user.id }).lean();
    if (!child) return Response.json({ message: 'Hồ sơ của bé không thuộc tài khoản này.' }, { status: 403 });
    const saved = await saveProgress({ childId: String(child._id), topicId, wordId, score: Number(score) || 0, minutes: Number(minutes) || 1 });
    await writeAuditLog({
      action: 'PROGRESS_UPSERT',
      resource: 'LEARNING_PROGRESS',
      resourceId: `${childId}:${topicId}:${wordId}`,
      actor: user?.id ? { userId: user.id, email: user.email, role: user.role } : undefined,
      request,
      metadata: { score: Number(score) || 0, minutes: Number(minutes) || 1 },
    });
    return Response.json(saved, { status: 201 });
  } catch (error) {
    console.error('[progress] POST failed:', error);
    return Response.json({ message: error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
