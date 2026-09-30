import { randomBytes } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { writeAuditLog } from '../../../../src/audit';
import { connectMongo, LearningCode, QRCode, Topic } from '../../../../src/models';
import QRCodeEncoder from 'qrcode';

const ADMIN_ROLES = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];

async function getAdmin(request: Request) {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;
    if (!user?.id || !ADMIN_ROLES.includes(user.role || '')) {
        return { response: Response.json({ message: 'Bạn không có quyền quản lý mã mở khóa.' }, { status: 403 }) };
    }
    return { user };
}

export async function GET(request: Request) {
    try {
        const auth = await getAdmin(request);
        if (auth.response) return auth.response;

        await connectMongo();
        const codes = await LearningCode.find({ maxUses: { $ne: null } }).sort({ createdAt: -1 }).limit(200).lean();
        const topicIds = [...new Set(codes.flatMap((code: any) => code.topicIds || []))];
        const topics = await Topic.find({ slug: { $in: topicIds } }, { slug: 1, title: 1, vietnamese: 1 }).lean();
        const topicById = new Map(topics.map((topic: any) => [topic.slug, topic]));

        const origin = new URL(request.url).origin;
        return Response.json(await Promise.all(codes.map(async (code: any) => {
            const scanUrl = new URL(`/api/qr/${encodeURIComponent(code.code)}`, origin).toString();
            const qrImage = await QRCodeEncoder.toDataURL(scanUrl, { margin: 2, width: 180 });
            return {
                id: String(code._id),
                code: code.code,
                qrUrl: scanUrl,
                qrImage,
                topicIds: code.topicIds || [],
                topics: (code.topicIds || []).map((id: string) => {
                    const topic: any = topicById.get(id);
                    return { id, title: topic?.title || id, vietnamese: topic?.vietnamese || '' };
                }),
                maxUses: code.maxUses,
                usedCount: code.usedCount || 0,
                isActive: code.isActive,
                createdAt: code.createdAt,
            };
        })));
    } catch (error) {
        console.error('[admin/learning-codes] GET failed:', error);
        return Response.json({ message: 'Không thể tải danh sách mã.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await getAdmin(request);
        if (auth.response) return auth.response;
        const body = await request.json();
        const topicIds: string[] = Array.isArray(body.topicIds)
            ? Array.from(new Set<string>(body.topicIds.map((id: unknown) => String(id).trim()).filter((id: string) => id.length > 0)))
            : [];
        const maxUses = Number(body.maxUses);

        if (topicIds.length === 0 || topicIds.length > 50) {
            return Response.json({ message: 'Chọn từ 1 đến 50 topic cho mã.' }, { status: 400 });
        }
        if (!Number.isSafeInteger(maxUses) || maxUses < 1 || maxUses > 100000) {
            return Response.json({ message: 'Số lượt dùng phải từ 1 đến 100.000.' }, { status: 400 });
        }

        await connectMongo();
        const topics = await Topic.find({ slug: { $in: topicIds } }, { slug: 1 }).lean();
        if (topics.length !== topicIds.length) {
            return Response.json({ message: 'Một hoặc nhiều topic không tồn tại.' }, { status: 400 });
        }

        let created: any;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const code = `ECO${randomBytes(6).toString('hex').toUpperCase()}`;
            try {
                created = await LearningCode.create({
                    code,
                    topicId: `bundle:${code}`,
                    wordId: '*',
                    topicIds,
                    maxUses,
                    usedCount: 0,
                    claimedParentIds: [],
                    isActive: true,
                });
                const targetId = `/learn?code=${encodeURIComponent(code)}&topic=${encodeURIComponent(topicIds[0])}`;
                await QRCode.updateOne({ code }, { code, targetId, isActive: true }, { upsert: true });
                break;
            } catch (error: any) {
                if (error?.code !== 11000 || attempt === 2) throw error;
            }
        }

        const user = auth.user!;
        await writeAuditLog({
            action: 'LEARNING_CODE_CREATE',
            resource: 'LEARNING_CODE',
            resourceId: String(created._id),
            actor: { userId: user.id, email: user.email, role: user.role },
            request,
            metadata: { topicIds, maxUses },
        });

        const scanUrl = new URL(`/api/qr/${encodeURIComponent(created.code)}`, new URL(request.url).origin).toString();
        const qrImage = await QRCodeEncoder.toDataURL(scanUrl, { margin: 2, width: 220 });
        return Response.json({ message: 'Đã tạo mã mở khóa.', id: String(created._id), code: created.code, qrUrl: scanUrl, qrImage }, { status: 201 });
    } catch (error) {
        console.error('[admin/learning-codes] POST failed:', error);
        return Response.json({ message: 'Không thể tạo mã mở khóa.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const auth = await getAdmin(request);
        if (auth.response) return auth.response;
        const body = await request.json();
        const id = String(body.id || '');
        if (!/^[a-f\d]{24}$/i.test(id) || typeof body.isActive !== 'boolean') {
            return Response.json({ message: 'Thông tin cập nhật mã không hợp lệ.' }, { status: 400 });
        }

        await connectMongo();
        const updated: any = await LearningCode.findOneAndUpdate(
            { _id: id, maxUses: { $ne: null } },
            { isActive: body.isActive },
            { new: true, runValidators: true },
        ).lean();
        if (!updated) return Response.json({ message: 'Không tìm thấy mã quản trị.' }, { status: 404 });
        await QRCode.updateOne({ code: updated.code }, { isActive: updated.isActive });

        const user = auth.user!;
        await writeAuditLog({
            action: 'LEARNING_CODE_STATUS_UPDATE',
            resource: 'LEARNING_CODE',
            resourceId: id,
            actor: { userId: user.id, email: user.email, role: user.role },
            request,
            metadata: { isActive: updated.isActive },
        });
        return Response.json({ message: 'Đã cập nhật trạng thái mã.', isActive: updated.isActive });
    } catch (error) {
        console.error('[admin/learning-codes] PATCH failed:', error);
        return Response.json({ message: 'Không thể cập nhật mã mở khóa.' }, { status: 500 });
    }
}
