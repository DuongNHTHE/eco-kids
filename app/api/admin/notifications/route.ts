import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { connectMongo, Notification, Partner } from '../../../../src/models';

const allowedRoles = new Set(['ADMIN', 'TEACHER', 'SCHOOL_ADMIN']);
const statuses = ['new', 'contacted', 'qualified', 'closed'] as const;

async function getAdminUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  return user?.id && user.role && allowedRoles.has(user.role) ? user : null;
}

function serializePartner(partner: any) {
  const data = partner.data || {};
  return {
    id: String(partner._id || partner.id),
    type: partner.type || 'PARTNER_LEAD_CREATE',
    title: partner.title || 'Khách hàng đăng ký tư vấn',
    message: partner.message || '',
    resourceId: partner.resourceId || '',
    organization: data.organization || '',
    contactName: data.contactName || '',
    phone: data.phone || '',
    email: data.email || '',
    studentCount: data.studentCount || null,
    note: data.note || '',
    status: partner.status || 'new',
    isRead: Boolean(partner.isRead),
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
  };
}

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({ message: 'Bạn không có quyền xem thông báo.' }, { status: 403 });

  try {
    const status = new URL(request.url).searchParams.get('status');
    const query = status && statuses.includes(status as typeof statuses[number]) ? { status } : {};
    await connectMongo();
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return Response.json({ notifications: notifications.map(serializePartner) });
  } catch (error) {
    console.error('admin notifications query error', error);
    return Response.json({ message: 'Không thể tải thông báo.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({ message: 'Bạn không có quyền cập nhật thông báo.' }, { status: 403 });

  try {
    const body = await request.json();
    const notificationId = String(body.notificationId || '').trim();
    const status = String(body.status || '').trim();
    if (!notificationId || !statuses.includes(status as typeof statuses[number])) {
      return Response.json({ message: 'Thông báo hoặc trạng thái không hợp lệ.' }, { status: 400 });
    }

    await connectMongo();
    const notification: any = await Notification.findByIdAndUpdate(
      notificationId,
      { status, isRead: status !== 'new', updatedAt: new Date() },
      { new: true, runValidators: true },
    ).lean();
    if (!notification) return Response.json({ message: 'Không tìm thấy thông báo.' }, { status: 404 });

    if (notification.resourceId) {
      await Partner.findByIdAndUpdate(notification.resourceId, { status, updatedAt: new Date() });
    }

    return Response.json({ message: 'Đã cập nhật trạng thái thông báo.', notification: serializePartner(notification) });
  } catch (error) {
    console.error('admin notification update error', error);
    return Response.json({ message: 'Không thể cập nhật thông báo.' }, { status: 500 });
  }
}