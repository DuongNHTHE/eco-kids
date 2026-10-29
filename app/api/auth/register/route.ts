import { NextResponse } from 'next/server';
import { writeAuditLog } from '../../../../src/audit';
import { connectMongo, User } from '../../../../src/models';
import { hashPassword } from '../../../../src/password';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Dữ liệu đăng ký không hợp lệ.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ success: false, message: 'Dữ liệu đăng ký không hợp lệ.' }, { status: 400 });
  }

  const data = payload as Record<string, unknown>;
  const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return NextResponse.json({
      success: false,
      message: 'Username phải có 3-30 ký tự, chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.',
    }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ success: false, message: 'Email không hợp lệ.' }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ success: false, message: 'Mật khẩu phải có từ 8 đến 128 ký tự.' }, { status: 400 });
  }

  try {
    await connectMongo();

    const existing = await User.findOne({ $or: [{ username }, { email }] }).select('_id').lean();
    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'Username hoặc email đã được sử dụng.',
      }, { status: 409 });
    }

    await User.create({
      username,
      email,
      password: await hashPassword(password),
      name: username,
      role: 'PARENT',
      updatedAt: new Date(),
    });

    await writeAuditLog({
      action: 'REGISTER_SUCCESS',
      resource: 'AUTH_SESSION',
      actor: { email },
      metadata: { provider: 'credentials', username },
      request,
    });

    return NextResponse.json({ success: true, message: 'Đăng ký thành công. Bạn có thể đăng nhập ngay.' }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({
        success: false,
        message: 'Username hoặc email đã được sử dụng.',
      }, { status: 409 });
    }

    console.error('registration error', error);
    return NextResponse.json({ success: false, message: 'Không thể đăng ký tài khoản.' }, { status: 500 });
  }
}
