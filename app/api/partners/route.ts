import { createPartner } from '../../../src/store';
import { writeAuditLog } from '../../../src/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const organization = String(body?.organization || '').trim();
    const contactName = String(body?.contactName || '').trim();
    const phone = String(body?.phone || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const note = String(body?.note || '').trim();
    const rawStudentCount = String(body?.studentCount || '').trim();
    const studentCount = rawStudentCount ? Number(rawStudentCount) : undefined;

    if (!organization || !contactName || !phone) return Response.json({ message: 'Vui lòng nhập đủ thông tin liên hệ.' }, { status: 400 });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ message: 'Email không hợp lệ.' }, { status: 400 });
    if (studentCount !== undefined && (!Number.isInteger(studentCount) || studentCount < 1 || studentCount > 100000)) {
      return Response.json({ message: 'Số lượng học sinh không hợp lệ.' }, { status: 400 });
    }

    const partner = await createPartner({ organization, contactName, phone, email, studentCount, note });
    await writeAuditLog({
      action: 'PARTNER_LEAD_CREATE',
      resource: 'PARTNER_LEAD',
      resourceId: String(partner._id || partner.id),
      request,
      metadata: { organization, contactName, studentCount },
    });
    return Response.json({ message: 'ECO-KIDS đã nhận đăng ký. Đội ngũ sẽ liên hệ sớm!', id: partner.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
