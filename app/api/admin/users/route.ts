import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { connectMongo, User } from '../../../../src/models';

const allowedRoles = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];

async function getAdminUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
    return user?.id && user.role && allowedRoles.includes(user.role) ? user : null;
}

function serializeUser(user: any) {
    return {
        id: String(user._id || user.id),
        name: user.name || 'Chưa cập nhật',
        email: user.email || 'Chưa cập nhật',
        role: user.role || 'PARENT',
        avatar: user.avatar || '',
        createdAt: user.createdAt || new Date().toISOString(),
    };
}

export async function GET() {
    const user = await getAdminUser();
    if (!user) return Response.json({ message: 'Bạn không có quyền xem danh sách người dùng.' }, { status: 403 });

    try {
        await connectMongo();
        const users = await User.find({}).sort({ createdAt: -1 }).lean();

        return Response.json(users.map(serializeUser));
    } catch (error) {
        console.error('admin users query error', error);
        return Response.json({ message: 'Không thể tải danh sách người dùng.' }, { status: 500 });
    }
}
