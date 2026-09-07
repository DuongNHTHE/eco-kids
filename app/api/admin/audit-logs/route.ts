import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { AuditLog, connectMongo } from '../../../../src/models';

const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!user) return Response.json({ message: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.' }, { status: 401 });
  if (user.role !== 'ADMIN') return Response.json({ message: 'Bạn không có quyền xem audit log.' }, { status: 403 });

  try {
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page')) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get('limit')) || 25));
    const query: Record<string, unknown> = {};

    if (params.get('action')) query.action = params.get('action');
    if (params.get('resource')) query.resource = params.get('resource');
    if (params.get('userId')) query.user_id = params.get('userId');

    const from = params.get('from');
    const to = params.get('to');
    if (from || to) {
      query.createdAt = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }

    await connectMongo();
    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return Response.json({
      items: items.map(item => ({
        id: String(item._id),
        userId: item.user_id || null,
        actorEmail: item.actorEmail || null,
        actorRole: item.actorRole || null,
        action: item.action,
        resource: item.resource,
        resourceId: item.resourceId || null,
        metadata: item.metadata || null,
        ipAddress: item.ipAddress || null,
        userAgent: item.userAgent || null,
        success: item.success !== false,
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('audit log query error', error);
    return Response.json({ message: 'Không thể tải audit log.' }, { status: 500 });
  }
}
