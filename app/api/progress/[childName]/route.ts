import { getProgress } from '../../../../src/store';

type RouteContext = { params: Promise<{ childName: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { childName } = await context.params;
    const records = await getProgress(childName);
    const totalMinutes = records.reduce((sum, item) => sum + (item.minutes || 0), 0);
    const averageScore = records.length ? Math.round(records.reduce((sum, item) => sum + (item.score || 0), 0) / records.length) : 0;
    return Response.json({ childName, records, stats: { wordsLearned: records.length, totalMinutes, averageScore, streak: Math.min(7, Math.max(1, records.length)) } });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
