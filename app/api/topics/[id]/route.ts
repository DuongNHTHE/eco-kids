import { getTopics } from '../../../../src/content';
import { connectMongo, Model3D, QRCode, Topic, Vocabulary } from '../../../../src/models';
import { writeAuditLog } from '../../../../src/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import QRCodeEncoder from 'qrcode';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const topic = (await getTopics()).find(item => item.id === id);
  if (!topic) return Response.json({ message: 'Không tìm thấy chủ đề.' }, { status: 404 });

  await connectMongo();
  const words = await Promise.all(topic.words.map(async (word: any) => {
    const code = `${topic.id}:${word.id}`;
    const target = `/learn?topic=${encodeURIComponent(topic.id)}&word=${encodeURIComponent(word.id)}`;
    await QRCode.updateOne(
      { code },
      { code, targetId: target, isActive: true },
      { upsert: true },
    );

    const scanUrl = new URL(`/api/qr/${encodeURIComponent(code)}`, _request.url).toString();
    return {
      ...word,
      qr: {
        code,
        url: scanUrl,
        image: await QRCodeEncoder.toDataURL(scanUrl, { margin: 2, width: 220 }),
      },
    };
  }));

  return Response.json({ ...topic, words });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const title = String(body.title || '').trim();
    const vietnamese = String(body.vietnamese || '').trim();
    const icon = String(body.icon || '').trim();
    const color = String(body.color || '').trim();
    const description = String(body.description || '').trim();

    if (!title || !vietnamese || !icon || !/^#[0-9a-f]{6}$/i.test(color)) {
      return Response.json({ message: 'Vui lòng nhập đủ tên, biểu tượng và màu chủ đề hợp lệ.' }, { status: 400 });
    }

    await connectMongo();
    const topic: any = await Topic.findOneAndUpdate(
      { slug: id },
      { title, vietnamese, icon, color, description },
      { new: true, runValidators: true },
    ).lean();
    if (!topic) return Response.json({ message: 'Không tìm thấy chủ đề.' }, { status: 404 });

    return Response.json({ message: 'Đã cập nhật chủ đề.', topic: { ...topic, id: topic.slug } });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Không thể cập nhật chủ đề. Vui lòng thử lại.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await connectMongo();

    const topic = await Topic.findOne({ slug: id }).lean();
    if (!topic) return Response.json({ message: 'Không tìm thấy chủ đề.' }, { status: 404 });

    const words = await Vocabulary.find({ topicId: id }, { id: 1 }).lean();
    const wordIds = words.map(word => String(word.id));
    await Promise.all([
      Topic.deleteOne({ slug: id }),
      Vocabulary.deleteMany({ topicId: id }),
      Model3D.deleteMany({ vocabularyId: { $in: wordIds } }),
      QRCode.deleteMany({ code: new RegExp(`^${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}:`) }),
    ]);

    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;
    await writeAuditLog({
      action: 'TOPIC_DELETE',
      resource: 'TOPIC',
      resourceId: id,
      actor: user?.id ? { userId: user.id, email: user.email, role: user.role } : undefined,
      request,
      metadata: { wordCount: wordIds.length },
    });

    return Response.json({ message: 'Đã xóa chủ đề.' });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Không thể xóa chủ đề. Vui lòng thử lại.' }, { status: 500 });
  }
}


