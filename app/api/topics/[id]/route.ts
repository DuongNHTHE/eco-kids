import { getTopics } from '../../../../src/content';
import { connectMongo, Topic, Vocabulary } from '../../../../src/models';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const topic = (await getTopics()).find(item => item.id === id);
  if (!topic) return Response.json({ message: 'Không tìm thấy chủ đề.' }, { status: 404 });
  return Response.json(topic);
}

function normalizeWord(word: any, fallbackId?: string) {
  const english = String(word?.english || '').trim();
  return {
    id: String(word?.id || fallbackId || english).trim().toLowerCase().replace(/\s+/g, '-'),
    english,
    vietnamese: String(word?.vietnamese || '').trim(),
    phonetic: String(word?.phonetic || '').trim(),
    prompt: String(word?.prompt || '').trim(),
    shape: String(word?.shape || 'rocket').trim(),
    modelUrl: String(word?.modelUrl || '').trim(),
    color: String(word?.color || '#6eaa83').trim(),
  };
}

function deleteWord(words: any[], body: any) {
  const wordId = String(body?.wordId || '').trim();
  if (!wordId || !words.some((word: any) => word.id === wordId)) return { error: 'Không tìm thấy bài học.', status: 404 };
  return { wordId };
}

function createWord(words: any[], body: any) {
  const word = normalizeWord(body?.word);
  if (!word.english || !word.vietnamese || !word.prompt) return { error: 'Bài học cần có tiếng Anh, tiếng Việt và câu ví dụ.', status: 400 };
  if (word.modelUrl && !/^https?:\/\/\S+$/i.test(word.modelUrl)) return { error: 'URL mô hình 3D phải bắt đầu bằng http:// hoặc https://.', status: 400 };
  if (words.some((item: any) => item.id === word.id)) return { error: 'Bài học này đã tồn tại trong chủ đề.', status: 409 };
  return { word };
}

function updateWord(words: any[], body: any) {
  const word = normalizeWord(body?.word);
  if (!word.english || !word.vietnamese || !word.prompt) return { error: 'Bài học cần có tiếng Anh, tiếng Việt và câu ví dụ.', status: 400 };
  if (word.modelUrl && !/^https?:\/\/\S+$/i.test(word.modelUrl)) return { error: 'URL mô hình 3D phải bắt đầu bằng http:// hoặc https://.', status: 400 };
  const wordId = String(body?.wordId || '').trim();
  const index = words.findIndex((item: any) => item.id === wordId);
  if (index < 0) return { error: 'Không tìm thấy bài học.', status: 404 };
  word.id = wordId;
  return { word, wordId };
}

function updateWords(words: any[], action: string, body: any) {
  if (action === 'delete') return deleteWord(words, body);
  if (action === 'create') return createWord(words, body);
  return updateWord(words, body);
}

async function handleWordMutation(request: Request, context: RouteContext, requiredAction?: string) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = String(body?.action || '');

    if (!['create', 'update', 'delete'].includes(action) || (requiredAction && action !== requiredAction)) {
      return Response.json({ message: 'Thao tác bài học không hợp lệ.' }, { status: 400 });
    }

    await connectMongo();
    const topic: any = await Topic.findOne({ slug: id }).lean();
    if (!topic) return Response.json({ message: 'Không tìm thấy chủ đề.' }, { status: 404 });

    let words = await Vocabulary.find({ topicId: id }).sort({ createdAt: 1 }).lean();
    if (!words.length && Array.isArray(topic.words) && topic.words.length) {
      await Vocabulary.insertMany(topic.words.map((word: any) => ({ topicId: id, ...word })), { ordered: false });
      words = await Vocabulary.find({ topicId: id }).sort({ createdAt: 1 }).lean();
    }
    const updateResult: any = updateWords(words, action, body);
    if (updateResult.error) return Response.json({ message: updateResult.error }, { status: updateResult.status });

    if (action === 'create') {
      await Vocabulary.create({ topicId: id, ...updateResult.word });
    } else if (action === 'update') {
      await Vocabulary.findOneAndUpdate({ topicId: id, id: updateResult.wordId }, { ...updateResult.word, updatedAt: new Date() }, { runValidators: true });
    } else {
      await Vocabulary.deleteOne({ topicId: id, id: updateResult.wordId });
    }
    const wordCount = await Vocabulary.countDocuments({ topicId: id });
    await Topic.updateOne({ slug: id }, { lessonCount: wordCount });
    const messages: Record<string, string> = { create: 'Đã thêm bài học.', update: 'Đã cập nhật bài học.', delete: 'Đã xóa bài học.' };
    const updatedTopic = (await getTopics()).find(item => item.id === id);
    return Response.json({ message: messages[action], topic: updatedTopic });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Không thể cập nhật bài học. Vui lòng thử lại.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  return handleWordMutation(request, context, 'create');
}

export async function PUT(request: Request, context: RouteContext) {
  return handleWordMutation(request, context);
}

