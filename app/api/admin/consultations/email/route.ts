import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { createMailTransport, getMailFrom } from '../../../../../lib/mail';
import { connectMongo, Partner } from '../../../../../src/models';
import { writeAuditLog } from '../../../../../src/audit';

const allowedRoles = new Set(['ADMIN', 'TEACHER', 'SCHOOL_ADMIN']);

async function getAdminUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
    return user?.id && user.role && allowedRoles.has(user.role) ? user : null;
}

export async function POST(request: Request) {
    const user = await getAdminUser();
    if (!user) return Response.json({ message: 'Bạn không có quyền gửi email tư vấn.' }, { status: 403 });

    try {
        const body = await request.json();
        const consultationId = String(body.consultationId || '').trim();
        const subject = String(body.subject || '').trim();
        const message = String(body.message || '').trim();
        if (!consultationId || !subject || !message) {
            return Response.json({ message: 'Vui lòng nhập tiêu đề và nội dung email.' }, { status: 400 });
        }
        if (subject.length > 180 || message.length > 10000) {
            return Response.json({ message: 'Tiêu đề hoặc nội dung email quá dài.' }, { status: 400 });
        }

        await connectMongo();
        const consultation: any = await Partner.findById(consultationId).lean();
        if (!consultation) return Response.json({ message: 'Không tìm thấy yêu cầu tư vấn.' }, { status: 404 });
        if (!consultation.email) return Response.json({ message: 'Người liên hệ chưa cung cấp email.' }, { status: 400 });

        const transporter = createMailTransport();
        await transporter.sendMail({
            from: getMailFrom(),
            to: consultation.email,
            subject,
            text: message,
            replyTo: user.email || undefined,
        });

        await writeAuditLog({
            action: 'PARTNER_LEAD_EMAIL_SENT',
            resource: 'PARTNER_LEAD',
            resourceId: consultationId,
            actor: { userId: user.id, email: user.email, role: user.role },
            request,
            metadata: { recipient: consultation.email, subject },
        });

        return Response.json({ message: 'Đã gửi email tư vấn.' });
    } catch (error) {
        console.error('consultation email error', error);
        return Response.json({ message: 'Không thể gửi email. Hãy kiểm tra cấu hình SMTP.' }, { status: 500 });
    }
}
