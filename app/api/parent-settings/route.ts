import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { connectMongo, ParentSettings } from '../../../src/models';
import { hashParentCode, verifyParentCode } from '../../../src/parent-settings-code';

type ParentSettingsRecord = {
    useParentCode?: boolean;
    parentCodeSalt?: string;
    parentCodeHash?: string;
    failedCodeAttempts?: number;
    parentCodeLockedUntil?: Date | null;
};

async function getParent() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string | null } | undefined;
    return user?.id && user.role === 'PARENT' ? user : null;
}

function isValidParentCode(code: unknown): code is string {
    return typeof code === 'string' && /^\d{6,12}$/.test(code);
}

export async function GET() {
    try {
        const parent = await getParent();
        if (!parent) return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

        await connectMongo();
        const settings = await ParentSettings.findOne({ userId: parent.id }, {
            useParentCode: 1,
            parentCodeHash: 1,
        }).lean() as ParentSettingsRecord | null;

        return Response.json({
            useParentCode: Boolean(settings?.useParentCode),
            hasParentCode: Boolean(settings?.parentCodeHash),
        });
    } catch (error) {
        console.error('[parent-settings] GET failed:', error);
        return Response.json({ message: 'Không thể tải cài đặt phụ huynh.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const parent = await getParent();
        if (!parent) return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

        const body = await request.json();
        if (typeof body.useParentCode !== 'boolean') {
            return Response.json({ message: 'Tuỳ chọn sử dụng mã không hợp lệ.' }, { status: 400 });
        }

        const hasNewCode = body.code !== undefined && body.code !== '';
        if (hasNewCode && !isValidParentCode(body.code)) {
            return Response.json({ message: 'Mã phụ huynh phải gồm từ 6 đến 12 chữ số.' }, { status: 400 });
        }

        await connectMongo();
        const currentSettings = await ParentSettings.findOne({ userId: parent.id }, {
            parentCodeHash: 1,
        }).lean() as ParentSettingsRecord | null;
        if (body.useParentCode && !currentSettings?.parentCodeHash && !hasNewCode) {
            return Response.json({ message: 'Hãy tạo mã phụ huynh trước khi bật tính năng này.' }, { status: 400 });
        }

        const update: Record<string, unknown> = {
            useParentCode: body.useParentCode,
            updatedAt: new Date(),
        };
        if (hasNewCode) {
            const hashedCode = await hashParentCode(body.code);
            update.parentCodeSalt = hashedCode.salt;
            update.parentCodeHash = hashedCode.hash;
            update.failedCodeAttempts = 0;
            update.parentCodeLockedUntil = null;
        }

        const settings = await ParentSettings.findOneAndUpdate(
            { userId: parent.id },
            { $set: update, $setOnInsert: { userId: parent.id } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        ).lean() as ParentSettingsRecord | null;

        return Response.json({
            message: 'Đã lưu cài đặt phụ huynh.',
            useParentCode: Boolean(settings?.useParentCode),
            hasParentCode: Boolean(settings?.parentCodeHash),
        });
    } catch (error) {
        console.error('[parent-settings] PATCH failed:', error);
        return Response.json({ message: 'Không thể lưu cài đặt phụ huynh.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const parent = await getParent();
        if (!parent) return Response.json({ message: 'Cần đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

        const body = await request.json();
        if (!isValidParentCode(body.code)) {
            return Response.json({ message: 'Mã phụ huynh phải gồm từ 6 đến 12 chữ số.' }, { status: 400 });
        }

        await connectMongo();
        const settings = await ParentSettings.findOne({ userId: parent.id }, {
            useParentCode: 1,
            parentCodeSalt: 1,
            parentCodeHash: 1,
            failedCodeAttempts: 1,
            parentCodeLockedUntil: 1,
        }).lean() as ParentSettingsRecord | null;
        if (!settings?.useParentCode || !settings.parentCodeSalt || !settings.parentCodeHash) {
            return Response.json({ message: 'Mã phụ huynh hiện không được bật.' }, { status: 409 });
        }

        const now = new Date();
        if (settings.parentCodeLockedUntil && settings.parentCodeLockedUntil > now) {
            return Response.json({ message: 'Bạn đã nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.' }, { status: 429 });
        }

        const valid = await verifyParentCode(body.code, settings.parentCodeSalt, settings.parentCodeHash);
        if (!valid) {
            const updatedSettings = await ParentSettings.findOneAndUpdate(
                { userId: parent.id },
                { $inc: { failedCodeAttempts: 1 } },
                { new: true, projection: { failedCodeAttempts: 1 } },
            ).lean() as ParentSettingsRecord | null;
            const hasReachedLimit = Number(updatedSettings?.failedCodeAttempts || 0) >= 5;
            if (hasReachedLimit) {
                await ParentSettings.updateOne(
                    { userId: parent.id },
                    { $set: { failedCodeAttempts: 0, parentCodeLockedUntil: new Date(Date.now() + 15 * 60 * 1000) } },
                );
                return Response.json({ message: 'Bạn đã nhập sai 5 lần. Vui lòng thử lại sau 15 phút.' }, { status: 429 });
            }
            return Response.json({ message: 'Mã phụ huynh không chính xác.' }, { status: 403 });
        }

        await ParentSettings.updateOne(
            { userId: parent.id },
            { $set: { failedCodeAttempts: 0, parentCodeLockedUntil: null } },
        );

        return Response.json({ verified: true });
    } catch (error) {
        console.error('[parent-settings] POST failed:', error);
        return Response.json({ message: 'Không thể xác minh mã phụ huynh.' }, { status: 500 });
    }
}
