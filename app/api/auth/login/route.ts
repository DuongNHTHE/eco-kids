import { NextResponse } from 'next/server';
import { connectMongo, User } from '../../../../src/models';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email và mật khẩu là bắt buộc.' }, { status: 400 });
    }

    await connectMongo();

    const normalizedEmail = String(email).trim().toLowerCase();
    const user: any = await User.findOne({ email: normalizedEmail }).lean();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Tài khoản không tồn tại.' }, { status: 401 });
    }

    const validPassword = user.password === String(password);
    if (!validPassword) {
      return NextResponse.json({ success: false, message: 'Mật khẩu không đúng.' }, { status: 401 });
    }

    const safeUser = {
      id: String(user._id || user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return NextResponse.json({ success: true, message: 'Đăng nhập thành công.', user: safeUser });
  } catch (error) {
    console.error('login error', error);
    return NextResponse.json({ success: false, message: 'Không thể đăng nhập.' }, { status: 500 });
  }
}
