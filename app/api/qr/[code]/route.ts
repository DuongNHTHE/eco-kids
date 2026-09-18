import { connectMongo, QRCode } from '../../../../src/models';

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await context.params;
        await connectMongo();

        const qr = await QRCode.findOneAndUpdate(
            { code: decodeURIComponent(code), isActive: true },
            { $inc: { scanCount: 1 } },
            { new: true }
        ).lean() as { targetId?: string } | null;

        if (!qr?.targetId || !String(qr.targetId).startsWith('/learn?')) {
            return Response.json({ message: 'Mã QR không hợp lệ hoặc đã bị vô hiệu hóa.' }, { status: 404 });
        }

        return Response.redirect(new URL(String(qr.targetId), request.url));
    } catch (error) {
        console.error('[qr] redirect failed:', error);
        return Response.json({ message: 'Không thể mở mã QR.' }, { status: 500 });
    }
}
