import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { writeAuditLog } from '../../../../src/audit';
import { connectMongo, Order } from '../../../../src/models';

const allowedRoles = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];
const statuses = ['new', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'];

async function getAdminUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
    return user?.id && user.role && allowedRoles.includes(user.role) ? user : null;
}

function serializeOrder(order: any) {
    return {
        id: String(order._id || order.id),
        customer: order.customer || {},
        items: order.items || [],
        total: Number(order.total || 0),
        status: order.status || 'new',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
}

export async function GET(request: Request) {
    const user = await getAdminUser();
    if (!user) return Response.json({ message: 'Bạn không có quyền xem đơn hàng.' }, { status: 403 });

    try {
        const params = new URL(request.url).searchParams;
        const status = params.get('status');
        const query = status && statuses.includes(status) ? { status } : {};
        await connectMongo();
        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
        return Response.json(orders.map(serializeOrder));
    } catch (error) {
        console.error('admin orders query error', error);
        return Response.json({ message: 'Không thể tải danh sách đơn hàng.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const user = await getAdminUser();
    if (!user) return Response.json({ message: 'Bạn không có quyền cập nhật đơn hàng.' }, { status: 403 });

    try {
        const body = await request.json();
        const orderId = String(body.orderId || '').trim();
        const status = String(body.status || '').trim();
        if (!orderId || !statuses.includes(status)) return Response.json({ message: 'Đơn hàng hoặc trạng thái không hợp lệ.' }, { status: 400 });

        await connectMongo();
        const order: any = await Order.findByIdAndUpdate(orderId, { status }, { new: true, runValidators: true }).lean();
        if (!order) return Response.json({ message: 'Không tìm thấy đơn hàng.' }, { status: 404 });

        await writeAuditLog({
            action: 'ORDER_STATUS_UPDATE',
            resource: 'ORDER',
            resourceId: orderId,
            actor: { userId: user.id, email: user.email, role: user.role },
            request,
            metadata: { status },
        });
        return Response.json({ message: 'Đã cập nhật trạng thái đơn hàng.', order: serializeOrder(order) });
    } catch (error) {
        console.error('admin order update error', error);
        return Response.json({ message: 'Không thể cập nhật đơn hàng.' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    return PATCH(request);
}