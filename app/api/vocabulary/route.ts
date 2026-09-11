import { getTopics } from '../../../src/content';
import { connectMongo, Model3D, Topic, Vocabulary } from '../../../src/models';
import { writeAuditLog } from '../../../src/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';

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
    if (!words.some((item: any) => item.id === wordId)) return { error: 'Không tìm thấy bài học.', status: 404 };
    word.id = wordId;
    return { word, wordId };
}

async function upsertModelForVocabulary(vocabularyId: string, word: any) {
    const modelUrl = String(word?.modelUrl || '').trim();
    const key = String(vocabularyId || word?.id || '').trim();
    if (!key) return;

    if (!modelUrl) {
        await Model3D.deleteMany({ vocabularyId: key });
        return;
    }

    await Model3D.updateOne(
        { vocabularyId: key },
        {
            vocabularyId: key,
            name: String(word?.english || 'model').trim() || 'model',
            modelUrl,
            previewUrl: '',
            animation: null,
            scale: 1,
            rotation: { x: 0, y: 0, z: 0 },
            isActive: true,
            updatedAt: new Date(),
        },
        { upsert: true }
    );
}

async function loadWords(topicId: string, topic: any) {
    let words = await Vocabulary.find({ topicId }).sort({ createdAt: 1 }).lean();
    if (!words.length && Array.isArray(topic.words) && topic.words.length) {
        await Vocabulary.insertMany(topic.words.map((word: any) => ({ topicId, ...word })), { ordered: false });
        words = await Vocabulary.find({ topicId }).sort({ createdAt: 1 }).lean();
    }
    return words;
}

async function resolveTopic(topicId: string) {
    if (!topicId) return null;
    return Topic.findOne({ slug: topicId }).lean();
}

export async function GET(request: Request) {
    try {
        const topicId = new URL(request.url).searchParams.get('topicId')?.trim() || '';
        await connectMongo();
        const topic: any = await resolveTopic(topicId);
        if (!topic) return Response.json({ message: 'Không tìm thấy chủ đề.' }, { status: 404 });
        return Response.json(await loadWords(topicId, topic));
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể tải bài học. Vui lòng thử lại.' }, { status: 500 });
    }
}

async function handleMutation(request: Request, requiredAction?: string) {
    try {
        const body = await request.json();
        const topicId = String(body?.topicId || '').trim();
        const action = String(body?.action || (requiredAction || ''));
        if (!topicId || !['create', 'update', 'delete'].includes(action) || (requiredAction && action !== requiredAction)) {
            return Response.json({ message: 'Thao tác bài học không hợp lệ.' }, { status: 400 });
        }

        await connectMongo();
        const topic: any = await resolveTopic(topicId);
        if (!topic) return Response.json({ message: 'Không tìm thấy chủ đề.' }, { status: 404 });

        const words = await loadWords(topicId, topic);
        let updateResult: any;
        if (action === 'delete') {
            updateResult = deleteWord(words, body);
        } else if (action === 'create') {
            updateResult = createWord(words, body);
        } else {
            updateResult = updateWord(words, body);
        }
        if (updateResult.error) return Response.json({ message: updateResult.error }, { status: updateResult.status });

        if (action === 'create') {
            const createdWord = await Vocabulary.create({ topicId, ...updateResult.word });
            await upsertModelForVocabulary(String(createdWord?.id || updateResult.word.id), updateResult.word);
        } else if (action === 'update') {
            const updatedWord = await Vocabulary.findOneAndUpdate({ topicId, id: updateResult.wordId }, { ...updateResult.word, updatedAt: new Date() }, { runValidators: true, new: true });
            await upsertModelForVocabulary(String(updatedWord?.id || updateResult.wordId), updateResult.word);
        } else {
            await Vocabulary.deleteOne({ topicId, id: updateResult.wordId });
            await Model3D.deleteMany({ vocabularyId: updateResult.wordId });
        }

        const wordCount = await Vocabulary.countDocuments({ topicId });
        await Topic.updateOne({ slug: topicId }, { lessonCount: wordCount });
        const session = await getServerSession(authOptions);
        const user = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;
        await writeAuditLog({
            action: `VOCABULARY_${action.toUpperCase()}`,
            resource: 'VOCABULARY',
            resourceId: updateResult.wordId || updateResult.word?.id,
            actor: user?.id ? { userId: user.id, email: user.email, role: user.role } : undefined,
            request,
            metadata: { topicId },
        });

        const messages: Record<string, string> = { create: 'Đã thêm bài học.', update: 'Đã cập nhật bài học.', delete: 'Đã xóa bài học.' };
        const updatedTopic = (await getTopics()).find(item => item.id === topicId);
        return Response.json({ message: messages[action], topic: updatedTopic });
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể cập nhật bài học. Vui lòng thử lại.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    return handleMutation(request, 'create');
}

export async function PUT(request: Request) {
    return handleMutation(request);
}