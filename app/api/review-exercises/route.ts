import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { Child, Progress, ReviewExercise, connectMongo } from '../../../src/models';
import { getTopics } from '../../../src/content';
import mongoose from 'mongoose';

type SessionUser = { id?: string; role?: string; email?: string | null };

async function getUser() {
    const session = await getServerSession(authOptions);
    return session?.user as SessionUser | undefined;
}

function isAdmin(user?: SessionUser) {
    return Boolean(user?.id && ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'].includes(user.role || ''));
}

function serializeExercise(exercise: any, topics: any[] = []) {
    const topic = topics.find(item => item.id === exercise.topicId);
    const word = topic?.words?.find((item: any) => item.id === exercise.wordId);
    return {
        id: String(exercise._id),
        topicId: exercise.topicId,
        type: exercise.type,
        title: exercise.title,
        prompt: exercise.prompt,
        answer: exercise.answer,
        hint: exercise.hint || '',
        wordId: exercise.wordId || '',
        word: word?.english || '',
        vietnamese: word?.vietnamese || '',
        phonetic: word?.phonetic || '',
        shape: word?.shape || '',
        modelUrl: word?.modelUrl || '',
        isActive: exercise.isActive !== false,
    };
}

function normalizeExercise(body: any) {
    const type = String(body?.type || '').trim().toUpperCase();
    const title = String(body?.title || '').trim();
    const prompt = String(body?.prompt || '').trim();
    const answer = String(body?.answer || '').trim();
    const topicId = String(body?.topicId || '').trim();
    if (!['PRONUNCIATION', 'FILL_BLANK'].includes(type)) return { error: 'Loại bài tập không hợp lệ.' };
    if (!topicId || !title || !prompt || !answer) return { error: 'Cần chọn chủ đề và nhập đủ nội dung bài tập.' };
    return {
        value: {
            type,
            title: title.slice(0, 120),
            prompt: prompt.slice(0, 500),
            answer: answer.slice(0, 120),
            hint: String(body?.hint || '').trim().slice(0, 240),
            wordId: String(body?.wordId || '').trim(),
            topicId,
        },
    };
}

export async function GET(request: Request) {
    try {
        const user = await getUser();
        const params = new URL(request.url).searchParams;
        const childId = params.get('childId')?.trim();
        const topicId = params.get('topicId')?.trim();
        await connectMongo();
        const topics = await getTopics();

        if (isAdmin(user)) {
            const query = topicId ? { topicId } : {};
            const exercises = await ReviewExercise.find(query).sort({ createdAt: -1 }).lean();
            return Response.json(exercises.map(exercise => serializeExercise(exercise, topics)));
        }

        if (!user?.id || user.role !== 'PARENT' || !childId) {
            return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });
        }

        if (!mongoose.Types.ObjectId.isValid(String(childId))) {
            return Response.json({ message: 'childId không hợp lệ.' }, { status: 400 });
        }
        const child: any = await Child.findOne({ _id: childId, parentId: user.id }).lean();
        if (!child) return Response.json({ message: 'Không tìm thấy hồ sơ của bé.' }, { status: 404 });

        const eligibleTopics = topics.filter(topic => {
            if (topicId && topic.id !== topicId) return false;
            const wordIds = (topic.words || []).map((word: any) => word.id);
            return wordIds.length > 0;
        });
        const progress = await Progress.find({ childId: child._id }).lean();
        const completedTopicIds = new Set(
            eligibleTopics
                .filter(topic => {
                    const wordIds = new Set((topic.words || []).map((word: any) => word.id));
                    const learned = new Set(progress.filter(item => item.topicId === topic.id).map(item => item.wordId));
                    return [...wordIds].every(wordId => learned.has(wordId));
                })
                .map(topic => topic.id)
        );
        const exercises = await ReviewExercise.find({ topicId: { $in: [...completedTopicIds] }, isActive: true }).sort({ createdAt: 1 }).lean();
        return Response.json({ exercises: exercises.map(exercise => serializeExercise(exercise, topics)), completedTopicIds: [...completedTopicIds] });
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể tải bài tập ôn luyện.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUser();
        if (!isAdmin(user)) return Response.json({ message: 'Bạn không có quyền quản lý bài tập.' }, { status: 403 });
        const normalized = normalizeExercise(await request.json());
        if (normalized.error) return Response.json({ message: normalized.error }, { status: 400 });
        await connectMongo();
        const exercise = await ReviewExercise.create(normalized.value);
        return Response.json({ data: serializeExercise(exercise), message: 'Đã thêm bài ôn luyện.' }, { status: 201 });
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể thêm bài ôn luyện.' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const user = await getUser();
        if (!isAdmin(user)) return Response.json({ message: 'Bạn không có quyền quản lý bài tập.' }, { status: 403 });
        const body = await request.json();
        const id = String(body?.id || '').trim();
        if (!id) return Response.json({ message: 'Thiếu mã bài tập.' }, { status: 400 });
        await connectMongo();
        if (body?.action === 'delete') {
            await ReviewExercise.findByIdAndDelete(id);
            return Response.json({ message: 'Đã xóa bài ôn luyện.' });
        }
        const normalized = normalizeExercise(body);
        if (normalized.error) return Response.json({ message: normalized.error }, { status: 400 });
        const updated = await ReviewExercise.findByIdAndUpdate(id, { ...normalized.value, updatedAt: new Date() }, { new: true, runValidators: true }).lean();
        if (!updated) return Response.json({ message: 'Không tìm thấy bài tập.' }, { status: 404 });
        return Response.json({ data: serializeExercise(updated), message: 'Đã cập nhật bài ôn luyện.' });
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể cập nhật bài ôn luyện.' }, { status: 500 });
    }
}