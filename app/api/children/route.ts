import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { Child, connectMongo } from '../../../src/models';

async function getParentSession() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id) return null;
    return user;
}

function isParent(user: { role?: string }) {
    return user.role === 'PARENT';
}

export async function GET() {
    try {
        const user = await getParentSession();
        if (!user) return Response.json({ message: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.' }, { status: 401 });
        if (!isParent(user)) return Response.json({ message: 'Tài khoản hiện tại không phải tài khoản phụ huynh.' }, { status: 403 });

        await connectMongo();
        const children = await Child.find({ parentId: user.id }).sort({ createdAt: 1 }).lean();
        return Response.json(children.map(child => ({
            id: String(child._id),
            name: child.name,
            nickname: child.nickname || '',
            avatar: child.avatar || '🧒',
            birthDate: child.birthDate || null,
            gender: child.gender || '',
            level: child.level || 1,
        })));
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể tải danh sách tài khoản của bé.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getParentSession();
        if (!user) return Response.json({ message: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.' }, { status: 401 });
        if (!isParent(user)) return Response.json({ message: 'Tài khoản hiện tại không phải tài khoản phụ huynh.' }, { status: 403 });

        const body = await request.json();
        const name = String(body.name || '').trim();
        const nickname = String(body.nickname || '').trim();
        const avatar = String(body.avatar || '🧒').trim();
        const gender = body.gender ? String(body.gender) : undefined;
        const birthDate = body.birthDate ? new Date(String(body.birthDate)) : undefined;

        if (name.length < 2 || name.length > 50) {
            return Response.json({ message: 'Tên của bé cần dài từ 2 đến 50 ký tự.' }, { status: 400 });
        }
        if (nickname.length > 50) return Response.json({ message: 'Tên gọi ở nhà không được quá 50 ký tự.' }, { status: 400 });
        if (gender && !['girl', 'boy', 'other'].includes(gender)) {
            return Response.json({ message: 'Giới tính không hợp lệ.' }, { status: 400 });
        }
        if (birthDate && Number.isNaN(birthDate.getTime())) {
            return Response.json({ message: 'Ngày sinh không hợp lệ.' }, { status: 400 });
        }

        await connectMongo();
        const child = await Child.create({
            parentId: user.id,
            name,
            nickname: nickname || undefined,
            avatar: avatar || '🧒',
            gender,
            birthDate,
        });

        const data = {
            id: String(child._id),
            name: child.name,
            nickname: child.nickname || '',
            avatar: child.avatar,
            birthDate: child.birthDate || null,
            gender: child.gender || '',
            level: child.level,
        };

        return Response.json({
            data: data,
            ok: true,
        }, { status: 201 });
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể tạo tài khoản cho bé. Vui lòng thử lại.' }, { status: 500 });
    }
}