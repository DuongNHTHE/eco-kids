import { saveProgress } from '../../../src/store';
import { writeAuditLog } from '../../../src/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childName, topicId, wordId, score, minutes } = body;
    if (!childName || !topicId || !wordId) return Response.json({ message: 'Thiếu thông tin bài học.' }, { status: 400 });
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;
    const saved = await saveProgress({ childName, topicId, wordId, score: Number(score) || 0, minutes: Number(minutes) || 1 });
    await writeAuditLog({
      action: 'PROGRESS_UPSERT',
      resource: 'LEARNING_PROGRESS',
      resourceId: `${childName}:${topicId}:${wordId}`,
      actor: user?.id ? { userId: user.id, email: user.email, role: user.role } : undefined,
      request,
      metadata: { score: Number(score) || 0, minutes: Number(minutes) || 1 },
    });
    return Response.json(saved, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
