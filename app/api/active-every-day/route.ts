import { getServerSession } from 'next-auth';
import { Prisma, PrismaClient } from '@prisma/client';
import { authOptions } from '../../../lib/next-auth';
import { callAgent } from '../../../lib/agent';

const globalForPrisma = globalThis as typeof globalThis & { ecoKidsPrisma?: PrismaClient };
const prisma = globalForPrisma.ecoKidsPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.ecoKidsPrisma = prisma;

type ParentSession = { id?: string; role?: string };
type GeneratedActivity = ReturnType<typeof parseGeneratedActivity>;
type ActivityType = 'MOVEMENT' | 'FAMILY';

const MAX_ATTEMPTS = 3;

const FOCUS_AREAS = [
    'vận động thô (nhảy, bò, đi, giữ thăng bằng)',
    'vận động tinh (nhặt, xếp, xé, xỏ, vẽ)',
    'ngôn ngữ (từ vựng, kể chuyện, bắt chước âm thanh)',
    'tư duy (phân loại, đếm, so sánh, tìm quy luật)',
    'phối hợp và lắng nghe (làm theo hướng dẫn, chơi luân phiên)',
    'cảm xúc và gắn kết (nhận biết cảm xúc, ôm, cảm ơn)',
    'tâm sự và nói chuyện (kể chuyện hàng ngày, chia sẻ cảm xúc)',
];
const ACTIVITY_TYPES: ActivityType[] = ['MOVEMENT', 'FAMILY'];

const inflight = new Map<string, Promise<GeneratedActivity>>();

function pickRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function todayInVietnam() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000+07:00`);
}

function startOfVietnamWeek(date: Date) {
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'short',
    }).format(date);
    const daysSinceMonday = ({ Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 } as Record<string, number>)[weekday] ?? 0;
    return new Date(date.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
}

function normalizeActivityTitle(title: string) {
    return title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('vi')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function ageInYears(birthDate: Date | null) {
    if (!birthDate) return null;
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 2 && age <= 12 ? age : null;
}

function sanitizeForPrompt(value: string) {
    return value.replace(/[\r\n"`{}]+/g, ' ').trim().slice(0, 50);
}

function parseGeneratedActivity(text: string) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('AI không trả về JSON.');

    const activity = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const title = typeof activity.title === 'string' ? activity.title.trim() : '';
    const description = typeof activity.description === 'string' ? activity.description.trim() : '';
    if (!title || !description) throw new Error('AI không trả về nội dung hoạt động hợp lệ.');

    const parsedDuration = Number(activity.durationMinutes);
    return {
        activityTitle: title.slice(0, 120),
        activityDescription: description.slice(0, 1200),
        activityType: (activity.type === 'MOVEMENT' ? 'MOVEMENT' : 'FAMILY') as ActivityType,
        durationMinutes: Number.isFinite(parsedDuration) ? Math.max(5, Math.min(30, Math.round(parsedDuration))) : 15,
    };
}

async function getParent() {
    const session = await getServerSession(authOptions);
    const user = session?.user as ParentSession | undefined;
    return user?.id && user.role === 'PARENT' ? user : null;
}

async function getOwnedChild(userId: string, childId: string) {
    return prisma.child.findFirst({
        where: { id: childId, parentId: userId },
        select: { id: true, name: true, nickname: true, birthDate: true },
    });
}

function buildPrompt(params: {
    childName: string;
    age: number | null;
    type: ActivityType;
    focus: string;
    excludedTitles: string[];
}) {
    const { childName, age, type, focus, excludedTitles } = params;
    const who = age ? `bé ${childName} (${age} tuổi)` : `bé ${childName} (3-5 tuổi)`;
    const excluded = excludedTitles.length
        ? `- Không trùng ý tưởng với các hoạt động đã gợi ý: ${excludedTitles.join('; ')}.`
        : '';

    return `Bạn là chuyên gia phát triển trẻ nhỏ. Hãy gợi ý MỘT hoạt động ngắn để ${who} chơi cùng người lớn trong gia đình, không dùng màn hình.

            Yêu cầu:
            - Loại hoạt động: ${type === 'MOVEMENT' ? 'vận động cơ thể' : 'tương tác gia đình (trò chuyện, sáng tạo, gắn kết)'}.
            - Mục tiêu phát triển chính: ${focus}.
            - Dùng đồ vật có sẵn trong nhà, không cần mua; có người lớn tham gia và giám sát.
            - An toàn: không leo trèo, không chạy gần đường, không vật sắc/nóng, không đồ nhỏ hoặc thức ăn dễ gây hóc.
            - Phù hợp với độ tuổi của bé, cách chơi đơn giản, làm được trong 5-30 phút.
            ${excluded}
            - Phải khác rõ ràng về cách chơi và mục tiêu, không chỉ đổi tên hoặc chi tiết nhỏ.

            Chỉ trả về một JSON hợp lệ, không markdown, không giải thích thêm:
            {"title": "...", "description": "...", "type": "${type}", "durationMinutes": 15}
            - title: tối đa 8 từ.
            - description: 30-50 từ, viết cho phụ huynh đọc, gồm cách chơi, lợi ích và một lưu ý an toàn.`;
}

async function generateActivity(childName: string, age: number | null, previousTitles: string[]) {
    const excludedTitles = [...previousTitles];
    const usedTitles = new Set(previousTitles.map(normalizeActivityTitle));
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
            const result = await callAgent({
                prompt: buildPrompt({
                    childName,
                    age,
                    type: pickRandom(ACTIVITY_TYPES),
                    focus: pickRandom(FOCUS_AREAS),
                    excludedTitles,
                }),
                temperature: 0.7,
                maxTokens: 2500,
            });
            const generated = parseGeneratedActivity(result.text);
            const normalized = normalizeActivityTitle(generated.activityTitle);
            if (!usedTitles.has(normalized)) return generated;

            usedTitles.add(normalized);
            excludedTitles.push(generated.activityTitle);
        } catch (error) {
            lastError = error;
            console.warn(`[active-every-day] generate attempt ${attempt + 1} failed:`, error);
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('AI không tạo được hoạt động mới, không trùng với hoạt động trong tuần.');
}

function generateActivityOnce(key: string, childName: string, age: number | null, previousTitles: string[]) {
    let promise = inflight.get(key);
    if (!promise) {
        promise = generateActivity(childName, age, previousTitles).finally(() => inflight.delete(key));
        inflight.set(key, promise);
    }
    return promise;
}

export async function GET(request: Request) {
    try {
        const user = await getParent();
        if (!user?.id) return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

        const childId = new URL(request.url).searchParams.get('childId')?.trim();
        if (!childId) return Response.json({ message: 'Thiếu thông tin tài khoản của bé.' }, { status: 400 });

        const child = await getOwnedChild(user.id, childId);
        if (!child) return Response.json({ message: 'Hồ sơ của bé không thuộc tài khoản này.' }, { status: 403 });

        const date = todayInVietnam();
        let activity = await prisma.activeEveryDay.findFirst({ where: { userId: user.id, childId, date } });
        if (activity?.activityTitle && activity.activityDescription) return Response.json(activity);

        // Chỉ cần tiêu đề để tránh trùng, không gửi mô tả để tiết kiệm token
        const previous = await prisma.activeEveryDay.findMany({
            where: {
                userId: user.id,
                childId,
                date: { gte: startOfVietnamWeek(date), lt: date },
                activityTitle: { not: null },
            },
            select: { activityTitle: true },
        });
        const previousTitles = previous.flatMap(item => (item.activityTitle ? [item.activityTitle] : []));

        const generated = await generateActivityOnce(
            `${childId}:${date.toISOString()}`,
            sanitizeForPrompt(child.nickname || child.name),
            ageInYears(child.birthDate),
            previousTitles,
        );

        if (activity) {
            activity = await prisma.activeEveryDay.update({ where: { id: activity.id }, data: generated });
            return Response.json(activity);
        }

        try {
            activity = await prisma.activeEveryDay.create({
                data: { userId: user.id, childId, date, isActive: true, ...generated },
            });
        } catch (error) {
            if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
            activity = await prisma.activeEveryDay.findFirst({ where: { userId: user.id, childId, date } });
            if (!activity) throw error;
        }

        return Response.json(activity);
    } catch (error) {
        console.error('[active-every-day] GET failed:', error);
        return Response.json({ message: 'Không thể tải hoạt động hôm nay. Vui lòng thử lại.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await getParent();
        if (!user?.id) return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

        const body = await request.json().catch(() => null);
        const childId = String(body?.childId || '').trim();
        if (!childId || typeof body?.isPerformed !== 'boolean') {
            return Response.json({ message: 'Thông tin cập nhật không hợp lệ.' }, { status: 400 });
        }
        const child = await getOwnedChild(user.id, childId);
        if (!child) return Response.json({ message: 'Hồ sơ của bé không thuộc tài khoản này.' }, { status: 403 });

        const activity = await prisma.activeEveryDay.findFirst({
            where: { userId: user.id, childId, date: todayInVietnam() },
        });
        if (!activity) return Response.json({ message: 'Chưa có hoạt động hôm nay.' }, { status: 404 });

        const updated = await prisma.activeEveryDay.update({
            where: { id: activity.id },
            data: { isPerformed: body.isPerformed },
        });
        return Response.json(updated);
    } catch (error) {
        console.error('[active-every-day] PATCH failed:', error);
        return Response.json({ message: 'Không thể cập nhật trạng thái hoạt động.' }, { status: 500 });
    }
}