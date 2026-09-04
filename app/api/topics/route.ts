import { getTopics } from '../../../src/content';
import { connectMongo, Topic, Vocabulary } from '../../../src/models';

export async function GET() {
  return Response.json(await getTopics());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, title, vietnamese, icon, color, description, words } = body;

    if (!slug || !title || !vietnamese || !Array.isArray(words) || !words.length) {
      return Response.json({ message: 'Vui lòng nhập tên, slug và ít nhất một từ vựng.' }, { status: 400 });
    }

    const normalizedSlug = String(slug).trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      return Response.json({ message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang.' }, { status: 400 });
    }

    const normalizedWords = words.map((word: any) => ({
      id: String(word.id || word.english || '').trim().toLowerCase().replace(/\s+/g, '-'),
      english: String(word.english || '').trim(),
      vietnamese: String(word.vietnamese || '').trim(),
      phonetic: String(word.phonetic || '').trim(),
      prompt: String(word.prompt || '').trim(),
      shape: String(word.shape || 'rocket').trim(),
      modelUrl: String(word.modelUrl || '').trim(),
      color: String(word.color || color || '#6eaa83').trim(),
    }));

    if (normalizedWords.some(word => !word.id || !word.english || !word.vietnamese || !word.prompt)) {
      return Response.json({ message: 'Mỗi từ vựng cần có tiếng Anh, tiếng Việt và câu ví dụ.' }, { status: 400 });
    }
    if (normalizedWords.some(word => word.modelUrl && !/^https?:\/\/\S+$/i.test(word.modelUrl))) {
      return Response.json({ message: 'URL mô hình 3D phải bắt đầu bằng http:// hoặc https://.' }, { status: 400 });
    }

    await connectMongo();
    const existing = await Topic.exists({ slug: normalizedSlug });
    if (existing) return Response.json({ message: 'Slug chủ đề đã tồn tại.' }, { status: 409 });

    const topic = await Topic.create({
      slug: normalizedSlug,
      title: String(title).trim(),
      vietnamese: String(vietnamese).trim(),
      icon: String(icon || '📚').trim(),
      color: String(color || '#6eaa83').trim(),
      description: String(description || '').trim(),
      lessonCount: 1,
    });

    await Vocabulary.insertMany(normalizedWords.map(word => ({ topicId: topic.slug, ...word })));
    await Topic.updateOne({ _id: topic._id }, { lessonCount: normalizedWords.length });

    return Response.json({ message: 'Đã thêm chủ đề.', topic: { ...topic.toObject(), id: topic.slug } }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    if (error?.code === 11000) return Response.json({ message: 'Slug chủ đề đã tồn tại.' }, { status: 409 });
    return Response.json({ message: 'Không thể thêm chủ đề. Vui lòng thử lại.' }, { status: 500 });
  }
}
