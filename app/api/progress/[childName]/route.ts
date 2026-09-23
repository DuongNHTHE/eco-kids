import { getProgress } from '../../../../src/store';
import { Child, connectMongo } from '../../../../src/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ childName: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { childName: childId } = await context.params;
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== 'PARENT') return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(String(childId))) return Response.json({ message: 'childId không hợp lệ.' }, { status: 400 });
    const child: any = await Child.findOne({ _id: childId, parentId: user.id }).lean();
    if (!child) return Response.json({ message: 'Không tìm thấy hồ sơ của bé.' }, { status: 404 });
    const records = await getProgress(childId);
    const totalMinutes = records.reduce((sum, item) => sum + (item.minutes || 0), 0);
    const averageScore = records.length ? Math.round(records.reduce((sum, item) => sum + (item.score || 0), 0) / records.length) : 0;
    return Response.json({ childId, childName: child.name, records, stats: { wordsLearned: records.length, totalMinutes, averageScore, streak: Math.min(7, Math.max(1, records.length)) } });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
