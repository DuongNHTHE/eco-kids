import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { connectMongo, Partner } from '../../../../src/models';
import { writeAuditLog } from '../../../../src/audit';

const allowedRoles = new Set(['ADMIN', 'TEACHER', 'SCHOOL_ADMIN']);
const statuses = ['new', 'contacted', 'qualified', 'closed'] as const;

type ConsultationStatus = typeof statuses[number];

async function getAdminUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  return user?.id && user.role && allowedRoles.has(user.role) ? user : null;
}

function serializeConsultation(partner: any) {
  return {
    id: String(partner._id || partner.id),
    organization: partner.organization || '',
    contactName: partner.contactName || '',
    phone: partner.phone || '',
    email: partner.email || '',
    studentCount: partner.studentCount || null,
    note: partner.note || '',
    status: partner.status || 'new',
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
  };
}

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({ message: 'Bạn không có quyền xem danh sách tư vấn.' }, { status: 403 });

  try {
    const status = new URL(request.url).searchParams.get('status');
    const query = status && statuses.includes(status as ConsultationStatus) ? { status } : {};
    await connectMongo();
    const consultations = await Partner.find(query).sort({ createdAt: -1 }).limit(200).lean();
    const counts = Object.fromEntries(await Promise.all(
      statuses.map(async currentStatus => [currentStatus, await Partner.countDocuments({ status: currentStatus })] as const),
    ));
    return Response.json({ consultations: consultations.map(serializeConsultation), counts });
  } catch (error) {
    console.error('admin consultations query error', error);
    return Response.json({ message: 'Không thể tải danh sách tư vấn.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({ message: 'Bạn không có quyền cập nhật tư vấn.' }, { status: 403 });

  try {
    const body = await request.json();
    const consultationId = String(body.consultationId || '').trim();
    const status = String(body.status || '').trim();
    if (!consultationId || !statuses.includes(status as ConsultationStatus)) {
      return Response.json({ message: 'Thông tin cập nhật không hợp lệ.' }, { status: 400 });
    }

    await connectMongo();
    const consultation = await Partner.findByIdAndUpdate(
      consultationId,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true },
    ).lean();
    if (!consultation) return Response.json({ message: 'Không tìm thấy yêu cầu tư vấn.' }, { status: 404 });

    await writeAuditLog({
      action: 'PARTNER_LEAD_STATUS_UPDATE',
      resource: 'PARTNER_LEAD',
      resourceId: consultationId,
      actor: { userId: user.id, email: user.email, role: user.role },
      request,
      metadata: { status },
    });
    return Response.json({ message: 'Đã cập nhật trạng thái tư vấn.', consultation: serializeConsultation(consultation) });
  } catch (error) {
    console.error('admin consultation update error', error);
    return Response.json({ message: 'Không thể cập nhật yêu cầu tư vấn.' }, { status: 500 });
  }
}
