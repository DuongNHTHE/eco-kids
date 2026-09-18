import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { callAgent, type AgentMessage, type AgentProvider } from '../../../lib/agent';
import { buildConversationTitle, normalizeHistoryMessages } from '../../../lib/agent-history';
import { PrismaClient, $Enums } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & { ecoKidsPrisma?: PrismaClient };
const prisma = globalForPrisma.ecoKidsPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.ecoKidsPrisma = prisma;

function normalizeProvider(provider?: string): AgentProvider | undefined {
    const value = provider?.trim().toLowerCase();
    if (!value) return undefined;
    if (value === 'openai' || value === 'gemini') return value;
    return undefined;
}

function normalizeMessages(payload: any): AgentMessage[] | undefined {
    if (!payload) return undefined;

    const rawMessages = Array.isArray(payload) ? payload : payload.messages;
    if (!Array.isArray(rawMessages)) return undefined;

    const messages = rawMessages
        .map((entry: any) => ({
            role: entry?.role === 'system' || entry?.role === 'assistant' || entry?.role === 'user' ? entry.role : 'user',
            content: String(entry?.content ?? '').trim(),
        }))
        .filter((entry) => entry.content.length > 0);

    return messages.length ? messages : undefined;
}

async function getSessionContext() {
    const session = await getServerSession(authOptions);
    const userId = session?.user && typeof (session.user as { id?: string }).id === 'string'
        ? (session.user as { id: string }).id.trim()
        : '';
    return {
        userId: userId || null,
        role: String((session?.user as { role?: string } | undefined)?.role || 'PARENT').toUpperCase(),
    };
}

function getSystemPrompt(role: string, childId: string | null) {
    if (role === 'ADMIN') {
        return 'Bạn là trợ lý quản trị ECO-KIDS. Hãy hỗ trợ quản trị viên về dữ liệu, nội dung bài học, người dùng, báo cáo và vận hành hệ thống. Trả lời ngắn gọn, chính xác, thực tế. Không giả định quyền truy cập hoặc tự thực hiện thao tác thay đổi dữ liệu nếu chưa được yêu cầu.';
    }

    if (childId) {
        return 'Bạn là trợ lý học tập ECO-KIDS dành cho trẻ nhỏ. Hãy giải thích đơn giản, vui vẻ, an toàn và phù hợp lứa tuổi; ưu tiên ví dụ tiếng Anh ngắn, khuyến khích bé tự suy nghĩ và không đưa nội dung nguy hiểm hoặc không phù hợp trẻ em.';
    }

    return 'Bạn là trợ lý dành cho phụ huynh ECO-KIDS. Hãy tư vấn cách đồng hành cùng con học tiếng Anh, theo dõi tiến bộ và sử dụng nội dung học tập. Trả lời rõ ràng, thực tế, thân thiện; không chẩn đoán y khoa hay đưa khẳng định vượt quá thông tin được cung cấp.';
}

async function resolveChildId(requestBody: any, userId: string) {
    const requestedChildId = typeof requestBody?.childId === 'string' ? requestBody.childId.trim() : '';
    if (requestedChildId) return requestedChildId;

    try {
        const child = await prisma.child.findFirst({
            where: { parentId: userId },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
        });
        return child?.id ?? null;
    } catch (error) {
        console.error('[agent] resolveChildId failed:', error);
        return null;
    }
}

async function saveConversationHistory({
    userId,
    childId,
    prompt,
    assistantText,
}: {
    userId: string;
    childId: string | null;
    prompt: string;
    assistantText: string;
}) {
    if (!childId) {
        console.warn('[agent] persistence skipped: no childId; saving as parent conversation');
    }

    try {
        const conversationKey = childId ? `user:${userId}:child:${childId}` : `user:${userId}`;
        console.info('[agent] persistence start:', {
            userId,
            childId,
            conversationKey,
        });

        const conversation = await prisma.aIConversation.upsert({
            where: { conversationKey },
            create: {
                userId,
                childId: childId || undefined,
                isChildConversation: Boolean(childId),
                conversationKey,
                type: $Enums.AIConversationType.CHAT,
                title: buildConversationTitle(prompt, 'Cuộc trò chuyện mới'),
            },
            update: {
                title: buildConversationTitle(prompt, 'Cuộc trò chuyện mới'),
            },
        });

        const allMessages = [
            { role: 'user' as const, content: prompt },
            { role: 'assistant' as const, content: assistantText },
        ];
        const documents = await prisma.aIMessage.createMany({
            data: allMessages
                .filter((message) => message.content.trim().length > 0)
                .map((message) => ({
                    conversationId: conversation.id,
                    role: message.role === 'assistant' ? $Enums.MessageRole.ASSISTANT : $Enums.MessageRole.USER,
                    content: message.content,
                })),
        });

        console.info('[agent] persistence success:', {
            conversationId: conversation.id,
            messageCount: documents.count,
        });

        return { conversationId: conversation.id, saved: true, saveError: null };
    } catch (error) {
        const saveError = error instanceof Error ? error.message : 'Không thể lưu lịch sử trò chuyện.';
        console.error('[agent] persistence failed:', { childId, error: saveError });
        return { conversationId: null, saved: false, saveError };
    }
}

export async function GET(request: Request) {
    try {
        const { userId } = await getSessionContext();
        if (!userId) {
            return Response.json({ ok: false, message: 'Cần đăng nhập.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const childId = searchParams.get('childId');

        const conversations = await prisma.aIConversation.findMany({
            where: { userId, childId: childId || null },
            orderBy: { updatedAt: 'desc' },
            take: 20,
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });

        return Response.json({
            ok: true,
            conversations: conversations.map((conversation) => ({
                id: conversation.id,
                type: conversation.type,
                title: conversation.title,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
                messages: conversation.messages.map((message) => ({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    createdAt: message.createdAt,
                })),
            })),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể tải lịch sử trò chuyện.';
        return Response.json({ ok: false, message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { userId, role: sessionRole } = await getSessionContext();
        if (!userId) {
            return Response.json({ ok: false, message: 'Cần đăng nhập.' }, { status: 401 });
        }
        const provider = normalizeProvider(body?.provider ?? process.env.AI_PROVIDER ?? undefined);
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        const priorHistory = normalizeHistoryMessages(Array.isArray(body?.history) ? body.history : undefined)
            ?? normalizeMessages(body)
            ?? [];
        const childId = await resolveChildId(body, userId);
        const systemPrompt = getSystemPrompt(sessionRole, childId);
        const messages = [{ role: 'system' as const, content: systemPrompt }, ...priorHistory];
        if (prompt) messages.push({ role: 'user', content: prompt });

        if (!prompt && priorHistory.length === 0) {
            return Response.json({ ok: false, message: 'Thiếu prompt hoặc messages.' }, { status: 400 });
        }

        const result = await callAgent({
            provider,
            model: body?.model,
            messages,
            temperature: typeof body?.temperature === 'number' ? body.temperature : undefined,
            maxTokens: typeof body?.maxTokens === 'number' ? body.maxTokens : undefined,
            timeoutMs: typeof body?.timeoutMs === 'number' ? body.timeoutMs : undefined,
            apiKey: body?.apiKey,
        });

        const persisted = await saveConversationHistory({
            userId,
            childId,
            prompt,
            assistantText: result.text,
        });

        return Response.json({
            ok: true,
            provider: result.provider,
            model: result.model,
            text: result.text,
            conversationId: persisted.conversationId,
            saved: persisted.saved,
            saveError: persisted.saveError,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể gọi AI agent.';
        return Response.json({ ok: false, message }, { status: 500 });
    }
}
