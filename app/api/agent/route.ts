import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { callAgent, type AgentMessage, type AgentProvider } from '../../../lib/agent';
import { buildConversationTitle, normalizeHistoryMessages } from '../../../lib/agent-history';
import { PrismaClient, $Enums } from '../../../src/generated/prisma/client';

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

async function resolveChildId(requestBody: any) {
    const requestedChildId = typeof requestBody?.childId === 'string' ? requestBody.childId.trim() : '';
    if (requestedChildId) return requestedChildId;

    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user && typeof (session.user as { id?: string }).id === 'string'
            ? (session.user as { id?: string }).id
            : undefined;
        if (!userId) return null;

        const child = await prisma.child.findFirst({
            where: { parentId: userId },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
        });

        return child?.id ?? null;
    } catch {
        return null;
    }
}

async function saveConversationHistory({
    childId,
    historyMessages,
    prompt,
    assistantText,
    conversationId,
}: {
    childId: string | null;
    historyMessages: AgentMessage[];
    prompt: string;
    assistantText: string;
    conversationId?: string | null;
}) {
    if (!childId) return { conversationId: conversationId ?? null, saved: false };

    let activeConversation = conversationId
        ? await prisma.aIConversation.findUnique({
            where: { id: conversationId },
            select: { id: true, title: true },
        })
        : null;

    if (!activeConversation) {
        const title = buildConversationTitle(prompt, 'Cuộc trò chuyện mới');
        activeConversation = await prisma.aIConversation.create({
            data: {
                childId,
                type: $Enums.AIConversationType.CHAT,
                title,
            },
            select: { id: true, title: true },
        });

        const allMessages = [...historyMessages, { role: 'user' as const, content: prompt }, { role: 'assistant' as const, content: assistantText }];
        await prisma.aIMessage.createMany({
            data: allMessages
                .filter((message) => message.content.trim().length > 0)
                .map((message) => ({
                    conversationId: activeConversation!.id,
                    role: message.role === 'assistant' ? $Enums.MessageRole.ASSISTANT : $Enums.MessageRole.USER,
                    content: message.content,
                })),
        });

        return { conversationId: activeConversation.id, saved: true };
    }

    const nextMessages = [
        { conversationId: activeConversation.id, role: $Enums.MessageRole.USER, content: prompt },
        { conversationId: activeConversation.id, role: $Enums.MessageRole.ASSISTANT, content: assistantText },
    ];

    await prisma.aIMessage.createMany({ data: nextMessages });

    if (!activeConversation.title || activeConversation.title === 'Cuộc trò chuyện mới') {
        await prisma.aIConversation.update({
            where: { id: activeConversation.id },
            data: { title: buildConversationTitle(prompt, activeConversation.title || 'Cuộc trò chuyện mới') },
        });
    }

    return { conversationId: activeConversation.id, saved: true };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const childId = searchParams.get('childId');
        if (!childId) {
            return Response.json({ ok: false, message: 'Thiếu childId.' }, { status: 400 });
        }

        const conversations = await prisma.aIConversation.findMany({
            where: { childId },
            orderBy: { updatedAt: 'desc' },
            take: 20,
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    select: { id: true, role: true, content: true, createdAt: true },
                },
            },
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
        const provider = normalizeProvider(body?.provider ?? process.env.AI_PROVIDER ?? undefined);
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        const priorHistory = normalizeHistoryMessages(Array.isArray(body?.history) ? body.history : undefined)
            ?? normalizeMessages(body)
            ?? [];
        const messages = priorHistory.length > 0
            ? [...priorHistory, ...(prompt ? [{ role: 'user' as const, content: prompt }] : [])]
            : (prompt ? [{ role: 'user' as const, content: prompt }] : undefined);

        if (!messages || messages.length === 0) {
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

        const childId = await resolveChildId(body);
        const conversationId = typeof body?.conversationId === 'string' && body.conversationId.trim() ? body.conversationId.trim() : null;
        const persisted = await saveConversationHistory({
            childId,
            historyMessages: priorHistory,
            prompt,
            assistantText: result.text,
            conversationId,
        });

        return Response.json({
            ok: true,
            provider: result.provider,
            model: result.model,
            text: result.text,
            conversationId: persisted.conversationId,
            saved: persisted.saved,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể gọi AI agent.';
        return Response.json({ ok: false, message }, { status: 500 });
    }
}
