import { topics } from '../../../../src/data';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const topic = topics.find(item => item.id === id);
  if (!topic) return Response.json({ message: 'Không tìm thấy chủ đề.' }, { status: 404 });
  return Response.json(topic);
}
