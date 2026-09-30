import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { connectMongo, LearningCode } from '../../../src/models';
import { writeAuditLog } from '../../../src/audit';

async function getParent() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;
    return user?.id && user.role === 'PARENT' ? user : null;
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as { id?: string; role?: string | null } | undefined;
        if (user?.id && ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'].includes(user.role || '')) {
            return Response.json([{ topicId: '*', wordId: '*' }]);
        }
        if (!user?.id || user.role !== 'PARENT') return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

        await connectMongo();
        const codes = await LearningCode.find({ claimedParentIds: user.id, isActive: true }, { topicId: 1, wordId: 1, topicIds: 1 }).lean();
        return Response.json(codes.flatMap((code: any) => (
            code.topicIds?.length
                ? code.topicIds.map((topicId: string) => ({ topicId, wordId: '*' }))
                : [{ topicId: code.topicId, wordId: code.wordId }]
        )));
    } catch (error) {
        console.error('[learning-codes] GET failed:', error);
        return Response.json({ message: 'Không thể tải bài học đã mở khóa.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const parent = await getParent();
        if (!parent) return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

        const body = await request.json();
        const code = String(body.code || '').replace(/[\s-]/g, '').toUpperCase();
        if (!code || code.length > 64) return Response.json({ message: 'Vui lòng nhập mã mở khóa hợp lệ.' }, { status: 400 });

        await connectMongo();
        const existing: any = await LearningCode.findOne({ code, isActive: true }).lean();
        if (!existing) {
            return Response.json({ message: 'Mã không hợp lệ hoặc đã bị vô hiệu hóa.' }, { status: 404 });
        }

        const wasAlreadyClaimed = (existing.claimedParentIds || []).some((id: unknown) => String(id) === parent.id);
        const claimed: any = wasAlreadyClaimed
            ? existing
            : await LearningCode.findOneAndUpdate(
                {
                    _id: existing._id,
                    isActive: true,
                    claimedParentIds: { $ne: parent.id },
                    ...(Number.isSafeInteger(existing.maxUses) ? { usedCount: { $lt: existing.maxUses } } : {}),
                },
                {
                    $addToSet: { claimedParentIds: parent.id },
                    $inc: { usedCount: 1 },
                    $set: { claimedAt: new Date() },
                },
                { new: true },
            ).lean();

        if (!claimed) {
            const alreadyClaimed: any = await LearningCode.findOne({ _id: existing._id, claimedParentIds: parent.id }).lean();
            if (alreadyClaimed) return Response.json(redemptionResult(alreadyClaimed, body.topicId));
            return Response.json({ message: 'Mã đã hết lượt sử dụng.' }, { status: 409 });
        }

        if (!wasAlreadyClaimed) await writeAuditLog({
            action: 'LEARNING_CODE_REDEEM',
            resource: 'LEARNING_CODE',
            resourceId: String(claimed._id),
            actor: { userId: parent.id, email: parent.email, role: parent.role },
            request,
            metadata: { topicId: claimed.topicId, wordId: claimed.wordId, topicIds: claimed.topicIds || [], usedCount: claimed.usedCount || 0 },
        });

        return Response.json(redemptionResult(claimed, body.topicId));
    } catch (error) {
        console.error('[learning-codes] POST failed:', error);
        return Response.json({ message: 'Không thể sử dụng mã mở khóa.' }, { status: 500 });
    }
}

function redemptionResult(code: any, requestedTopicId?: unknown) {
    const topicIds = Array.isArray(code.topicIds) ? code.topicIds : [];
    const requested = String(requestedTopicId || '');
    return {
        message: 'Đã mở khóa bài học.',
        topicId: topicIds.length ? (topicIds.includes(requested) ? requested : topicIds[0]) : code.topicId,
        wordId: topicIds.length ? '' : code.wordId,
        topicIds,
    };
}