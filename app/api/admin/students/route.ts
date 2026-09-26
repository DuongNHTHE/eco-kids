import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { Child, connectMongo, Progress, User } from '../../../../src/models';
import { writeAuditLog } from '../../../../src/audit';

const allowedRoles = new Set(['ADMIN', 'TEACHER', 'SCHOOL_ADMIN']);

async function getAdminUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
    return user?.id && user.role && allowedRoles.has(user.role) ? user : null;
}

type FieldResult = { value: unknown } | { error: string };

function toInputString(value: unknown) {
    return typeof value === 'string' ? value : '';
}

function toObjectIdString(value: unknown) {
    return value instanceof mongoose.Types.ObjectId ? value.toHexString() : toInputString(value);
}

const studentFieldNormalizers: Record<string, (value: unknown) => FieldResult> = {
    name(value) {
        const name = toInputString(value).trim();
        return name.length < 2 || name.length > 50
            ? { error: 'Tên học sinh cần dài từ 2 đến 50 ký tự.' }
            : { value: name };
    },
    nickname(value) {
        const nickname = toInputString(value).trim();
        return nickname.length > 50
            ? { error: 'Tên gọi ở nhà không được quá 50 ký tự.' }
            : { value: nickname || undefined };
    },
    avatar(value) {
        const avatar = toInputString(value).trim();
        return avatar.length > 16
            ? { error: 'Ảnh đại diện không hợp lệ.' }
            : { value: avatar || '🧒' };
    },
    birthDate(value) {
        if (value === null || value === '') return { value: null };
        const birthDate = new Date(toInputString(value));
        return Number.isNaN(birthDate.getTime()) || birthDate.getTime() > Date.now()
            ? { error: 'Ngày sinh không hợp lệ.' }
            : { value: birthDate };
    },
    gender(value) {
        const gender = toInputString(value);
        return gender && !['girl', 'boy', 'other'].includes(gender)
            ? { error: 'Giới tính không hợp lệ.' }
            : { value: gender || null };
    },
    level(value) {
        const level = Number(value);
        return !Number.isInteger(level) || level < 1 || level > 100
            ? { error: 'Cấp độ phải là số nguyên từ 1 đến 100.' }
            : { value: level };
    },
};

function normalizeStudentFields(body: Record<string, unknown>) {
    const update: Record<string, unknown> = {};
    for (const [field, normalize] of Object.entries(studentFieldNormalizers)) {
        if (!(field in body)) continue;
        const result = normalize(body[field]);
        if ('error' in result) return result;
        update[field] = result.value;
    }
    return Object.keys(update).length
        ? { value: update }
        : { error: 'Không có thông tin cần cập nhật.' };
}

export async function GET() {
    const user = await getAdminUser();
    if (!user) return Response.json({ message: 'Bạn không có quyền xem danh sách học sinh.' }, { status: 403 });

    try {
        await connectMongo();
        const [children, progress] = await Promise.all([
            Child.find({}).sort({ createdAt: -1 }).lean(),
            Progress.find({}).sort({ practicedAt: -1 }).lean(),
        ]);
        const parentIds = [...new Set(children.map(child => toObjectIdString(child.parentId)).filter(Boolean))];
        const parents = await User.find({ _id: { $in: parentIds } }).select('name email').lean();
        const parentsById = new Map(parents.map(parent => [toObjectIdString(parent._id), parent]));
        const progressByChild = new Map<string, typeof progress>();

        for (const item of progress) {
            const childId = String(item.childId || '');
            if (!childId) continue;
            const childProgress = progressByChild.get(childId) || [];
            childProgress.push(item);
            progressByChild.set(childId, childProgress);
        }

        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const students = children.map(child => {
            const id = toObjectIdString(child._id);
            const childProgress = progressByChild.get(id) || [];
            const averageScore = childProgress.length
                ? Math.round(childProgress.reduce((sum, item) => sum + Number(item.score || 0), 0) / childProgress.length)
                : 0;
            const lastStudiedAt = childProgress[0]?.practicedAt || null;
            const parent = parentsById.get(String(child.parentId));

            return {
                id,
                name: child.name || 'Chưa cập nhật',
                nickname: child.nickname || '',
                avatar: child.avatar || '🧒',
                birthDate: child.birthDate || null,
                gender: child.gender || '',
                level: child.level || 1,
                createdAt: child.createdAt || null,
                parentName: parent?.name || 'Không xác định',
                parentEmail: parent?.email || '',
                lessonsRecorded: childProgress.length,
                averageScore,
                lastStudiedAt,
                active: Boolean(lastStudiedAt && new Date(lastStudiedAt).getTime() >= weekAgo),
            };
        });

        return Response.json({ students });
    } catch (error) {
        console.error('admin students query error', error);
        return Response.json({ message: 'Không thể tải danh sách học sinh.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const user = await getAdminUser();
    if (!user) return Response.json({ message: 'Bạn không có quyền cập nhật hồ sơ học sinh.' }, { status: 403 });

    try {
        const body = await request.json() as Record<string, unknown>;
        const studentId = toInputString(body.studentId).trim();
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return Response.json({ message: 'Mã học sinh không hợp lệ.' }, { status: 400 });
        }

        const normalized = normalizeStudentFields(body);
        if ('error' in normalized) return Response.json({ message: normalized.error }, { status: 400 });
        const update = normalized.value;

        await connectMongo();
        const student: any = await Child.findByIdAndUpdate(studentId, update, { new: true, runValidators: true }).lean();
        if (!student) return Response.json({ message: 'Không tìm thấy học sinh.' }, { status: 404 });

        await writeAuditLog({
            action: 'STUDENT_UPDATE',
            resource: 'CHILD',
            resourceId: studentId,
            actor: { userId: user.id, email: user.email, role: user.role },
            request,
            metadata: { fields: Object.keys(update) },
        });

        return Response.json({
            message: 'Đã cập nhật hồ sơ học sinh.',
            student: {
                id: String(student._id),
                name: student.name,
                nickname: student.nickname || '',
                avatar: student.avatar || '🧒',
                birthDate: student.birthDate || null,
                gender: student.gender || '',
                level: student.level || 1,
                createdAt: student.createdAt || null,
            },
        });
    } catch (error) {
        console.error('admin student update error', error);
        return Response.json({ message: 'Không thể cập nhật hồ sơ học sinh.' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const user = await getAdminUser();
    if (!user) return Response.json({ message: 'Bạn không có quyền xóa hồ sơ học sinh.' }, { status: 403 });

    try {
        const studentId = new URL(request.url).searchParams.get('id')?.trim() || '';
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return Response.json({ message: 'Mã học sinh không hợp lệ.' }, { status: 400 });
        }

        await connectMongo();
        const student: any = await Child.findById(studentId).select('name').lean();
        if (!student) return Response.json({ message: 'Không tìm thấy học sinh.' }, { status: 404 });

        await Progress.deleteMany({ childId: studentId });
        await Child.findByIdAndDelete(studentId);
        await writeAuditLog({
            action: 'STUDENT_DELETE',
            resource: 'CHILD',
            resourceId: studentId,
            actor: { userId: user.id, email: user.email, role: user.role },
            request,
            metadata: { name: student.name },
        });

        return Response.json({ message: 'Đã xóa hồ sơ học sinh và tiến độ liên quan.' });
    } catch (error) {
        console.error('admin student delete error', error);
        return Response.json({ message: 'Không thể xóa hồ sơ học sinh.' }, { status: 500 });
    }
}