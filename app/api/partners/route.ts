import { createPartner } from '../../../src/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organization, contactName, phone } = body;
    if (!organization || !contactName || !phone) return Response.json({ message: 'Vui lòng nhập đủ thông tin liên hệ.' }, { status: 400 });
    const partner = await createPartner(body);
    return Response.json({ message: 'ECO-KIDS đã nhận đăng ký. Đội ngũ sẽ liên hệ sớm!', id: partner.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
