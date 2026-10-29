import { NextResponse } from 'next/server';
import { connectMongo, User } from '../../../../src/models';
import { verifyPassword } from '../../../../src/password';

export async function POST(request: Request) {
  try {
    const { email, username, identifier, password } = await request.json();
    const loginIdentifier = String(identifier || username || email || '').trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return NextResponse.json({ success: false, message: 'Email/username và mật khẩu là bắt buộc.' }, { status: 400 });
    }

    await connectMongo();

    const lookup = loginIdentifier.includes('@') ? { email: loginIdentifier } : { username: loginIdentifier };
    const user: any = await User.findOne(lookup).lean();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Tài khoản không tồn tại.' }, { status: 401 });
    }

    const validPassword = user.password && await verifyPassword(String(password), user.password);
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
