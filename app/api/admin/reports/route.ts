import { Child, connectMongo, Progress } from '../../../../src/models';
import { getTopics } from '../../../../src/content';

const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const accents = ['#f47d52', '#6eaa83', '#f5b83d', '#2d6358'];

function getAge(birthDate?: Date | string) {
    if (!birthDate) return 'Chưa cập nhật tuổi';
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật tuổi';
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const beforeBirthday = today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
    if (beforeBirthday) age -= 1;
    return `${Math.max(age, 0)} tuổi`;
}

function startOfDay(date: Date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

export async function GET() {
    try {
        await connectMongo();
        const [children, rawProgress, topics] = await Promise.all([
            Child.find().sort({ createdAt: 1 }).lean(),
            Progress.find().sort({ practicedAt: -1 }).lean(),
            getTopics(),
        ]);

        const progress = rawProgress as Array<{
            childId?: string | object;
            topicId?: string;
            wordId?: string;
            score?: number;
            minutes?: number;
            practicedAt?: Date | string;
            createdAt?: Date | string;
        }>;
        const childById = new Map(children.map(child => [String(child._id), child]));
        const topicById = new Map((topics as any[]).map(topic => [String(topic.id), topic]));
        const totalWords = (topics as any[]).reduce((sum, topic) => sum + (topic.words?.length || 0), 0);
        const now = new Date();
        const weekStart = startOfDay(now);
        weekStart.setDate(weekStart.getDate() - 6);
        const recentProgress = progress.filter(item => new Date(item.practicedAt || item.createdAt || 0) >= weekStart);
        const activeChildIds = new Set(recentProgress.map(item => String(item.childId)).filter(id => childById.has(id)));
        const averageScore = progress.length ? Math.round(progress.reduce((sum, item) => sum + Number(item.score || 0), 0) / progress.length) : 0;
        const completedChildren = children.filter(child => {
            if (!totalWords) return false;
            const learned = new Set(progress.filter(item => String(item.childId) === String(child._id)).map(item => `${item.topicId}:${item.wordId}`));
            return learned.size >= totalWords;
        }).length;

        const summary = [
            { label: 'Tổng số bé', value: children.length.toLocaleString('vi-VN'), change: `${activeChildIds.size} bé đang học`, tone: 'bg-[#f47d52]' },
            { label: 'Đang học', value: activeChildIds.size.toLocaleString('vi-VN'), change: `${recentProgress.length} lượt trong 7 ngày`, tone: 'bg-[#6eaa83]' },
            { label: 'Hoàn thành khóa', value: completedChildren.toLocaleString('vi-VN'), change: `${topics.length} chủ đề`, tone: 'bg-[#f5b83d]' },
            { label: 'Điểm trung bình', value: `${averageScore}/100`, change: `${progress.length} lượt ghi nhận`, tone: 'bg-[#2d6358]' },
        ];

        const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + index);
            const nextDay = new Date(day);
            nextDay.setDate(day.getDate() + 1);
            return {
                day: dayLabels[day.getDay()],
                minutes: recentProgress.filter(item => {
                    const practicedAt = new Date(item.practicedAt || item.createdAt || 0);
                    return practicedAt >= day && practicedAt < nextDay;
                }).reduce((sum, item) => sum + Number(item.minutes || 0), 0),
            };
        });
        const maxMinutes = Math.max(...weeklyActivity.map(item => item.minutes), 1);
        const trend = weeklyActivity.map(item => Math.round((item.minutes / maxMinutes) * 100));

        const students = children.map((child, index) => {
            const childId = String(child._id);
            const childProgress = progress.filter(item => String(item.childId) === childId);
            const childRecentProgress = childProgress.filter(item => new Date(item.practicedAt || item.createdAt || 0) >= weekStart);
            const latest = childProgress[0];
            const average = childProgress.length ? Math.round(childProgress.reduce((sum, item) => sum + Number(item.score || 0), 0) / childProgress.length) : 0;
            const weeklyProgress = totalWords ? Math.min(100, Math.round((new Set(childRecentProgress.map(item => `${item.topicId}:${item.wordId}`)).size / totalWords) * 100)) : 0;
            const status = average >= 90 ? 'Xuất sắc' : average >= 75 ? 'Đang tiến bộ tốt' : childProgress.length ? 'Cần nhắc thêm' : 'Chưa bắt đầu';
            const latestTopic = latest ? topicById.get(String(latest.topicId)) : null;
            return {
                name: child.name,
                age: getAge(child.birthDate),
                avatar: child.avatar || child.name?.charAt(0) || '🧒',
                level: `Level ${child.level || 1}`,
                weeklyProgress,
                avgScore: average,
                completedLessons: childProgress.length,
                streak: 0,
                status,
                focus: latestTopic?.title || 'Chưa có chủ đề',
                accent: accents[index % accents.length],
            };
        });

        const topicPerformance = (topics as any[]).map(topic => {
            const topicProgress = progress.filter(item => item.topicId === topic.id);
            const wordCount = topic.words?.length || 0;
            const score = topicProgress.length ? Math.round(topicProgress.reduce((sum, item) => sum + Number(item.score || 0), 0) / topicProgress.length) : 0;
            const progressPercent = children.length && wordCount
                ? Math.min(100, Math.round((new Set(topicProgress.map(item => `${item.childId}:${item.wordId}`)).size / (children.length * wordCount)) * 100))
                : 0;
            return { topic: topic.title, progress: progressPercent, score, lessons: wordCount };
        });

        return Response.json({ summary, trend, weeklyActivity, students, topicPerformance });
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể tải báo cáo tiến độ.' }, { status: 500 });
    }
}
