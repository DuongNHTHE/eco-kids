import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { connectMongo, UserActivity } from '../../../../src/models';
import { USER_ACTIVITY_TYPES } from '../../../../src/user-activity';

const MAX_LIMIT = 100;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!user) return Response.json({ message: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.' }, { status: 401 });
  if (user.role !== 'ADMIN') return Response.json({ message: 'Bạn không có quyền xem lịch sử hoạt động.' }, { status: 403 });

  try {
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(params.get('limit')) || 25)));
    const clauses: Record<string, unknown>[] = [];
    const eventType = params.get('eventType');
    if (eventType) {
      if (!USER_ACTIVITY_TYPES.includes(eventType as (typeof USER_ACTIVITY_TYPES)[number])) {
        return Response.json({ message: 'Loại hoạt động không hợp lệ.' }, { status: 400 });
      }
      clauses.push({ eventType });
    }

    const search = params.get('q')?.trim().slice(0, 100);
    if (search) {
      const expression = new RegExp(escapeRegExp(search), 'i');
      clauses.push({
        $or: [
          { actorEmail: expression },
          { path: expression },
          { targetLabel: expression },
        ],
      });
    }

    const fromValue = params.get('from');
    const toValue = params.get('to');
    const from = parseDate(fromValue);
    const to = parseDate(toValue);
    if ((fromValue && !from) || (toValue && !to)) {
      return Response.json({ message: 'Khoảng thời gian không hợp lệ.' }, { status: 400 });
    }
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.$gte = from;
      if (to) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(toValue || '')) to.setUTCDate(to.getUTCDate() + 1);
        createdAt.$lt = to;
      }
      clauses.push({ createdAt });
    }

    const query = clauses.length ? { $and: clauses } : {};
    await connectMongo();
    const [items, total] = await Promise.all([
      UserActivity.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserActivity.countDocuments(query),
    ]);

    return Response.json({
      items: items.map(item => ({
        id: String(item._id),
        userId: item.userId,
        actorEmail: item.actorEmail || null,
        actorRole: item.actorRole || null,
        eventType: item.eventType,
        path: item.path,
        targetType: item.targetType || null,
        targetLabel: item.targetLabel || null,
        ipAddress: item.ipAddress || null,
        userAgent: item.userAgent || null,
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
    console.error('user activity query error', error);
    return Response.json({ message: 'Không thể tải lịch sử hoạt động.' }, { status: 500 });
  }
}
