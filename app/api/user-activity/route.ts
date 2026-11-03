import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { parseUserActivityInput } from '../../../src/user-activity';
import { connectMongo, UserActivity } from '../../../src/models';

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || undefined;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (!user?.id) return Response.json({ message: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.' }, { status: 401 });

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return Response.json({ message: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
      }
    } catch {
      return Response.json({ message: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
    }
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ message: 'Dữ liệu hoạt động không hợp lệ.' }, { status: 400 });
  }

  const activity = parseUserActivityInput(input);
  if (!activity) return Response.json({ message: 'Dữ liệu hoạt động không hợp lệ.' }, { status: 400 });

  try {
    await connectMongo();
    await UserActivity.create({
      userId: user.id,
      actorEmail: user.email || undefined,
      actorRole: user.role || undefined,
      ...activity,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 500) || undefined,
    });
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('user activity write error', error);
    return Response.json({ message: 'Không thể lưu lịch sử hoạt động.' }, { status: 500 });
  }
}
