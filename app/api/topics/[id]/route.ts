import { getTopics } from '../../../../src/content';
import { connectMongo, QRCode } from '../../../../src/models';
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


