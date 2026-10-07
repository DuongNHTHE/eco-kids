import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { writeAuditLog } from '../../../../src/audit';
import { connectMongo, Order } from '../../../../src/models';

const allowedRoles = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];
const statuses = ['new', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'] as const;

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
        isRead: Boolean(order.isRead),
        invoice: order.invoice || null,
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
        const range = params.get('range') || '30';
        const isReadParam = params.get('isRead');
        const query: Record<string, unknown> = {};
        if (status && statuses.includes(status as typeof statuses[number])) query.status = status;
        if (isReadParam === 'true' || isReadParam === 'false') query.isRead = isReadParam === 'true';
        await connectMongo();
        const orders = await Order.find(query).sort({ isRead: 1, createdAt: -1 }).limit(100).lean();
        const countEntries = await Promise.all(
            statuses.map(async currentStatus => [currentStatus, await Order.countDocuments({ status: currentStatus })] as const),
        );

        const rangeDays = range === '7' || range === '30' || range === '90' ? Number(range) : null;
        const rangeMatch = rangeDays
            ? { createdAt: { $gte: new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000) } }
            : {};
        const chartStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [salesData] = await Order.aggregate([
            { $match: rangeMatch },
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                orderCount: { $sum: 1 },
                                revenue: {
                                    $sum: {
                                        $cond: [
                                            { $ne: ['$status', 'cancelled'] },
                                            { $ifNull: ['$total', 0] },
                                            0,
                                        ],
                                    },
                                },
                                saleCount: {
                                    $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] },
                                },
                                pendingCount: {
                                    $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] },
                                },
                                invoiceCount: {
                                    $sum: {
                                        $cond: [
                                            { $ne: [{ $ifNull: ['$invoice.number', null] }, null] },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                    dailySales: [
                        { $match: { createdAt: { $gte: chartStart }, status: { $ne: 'cancelled' } } },
                        {
                            $group: {
                                _id: {
                                    $dateToString: {
                                        format: '%Y-%m-%d',
                                        date: '$createdAt',
                                        timezone: 'Asia/Ho_Chi_Minh',
                                    },
                                },
                                revenue: { $sum: { $ifNull: ['$total', 0] } },
                                orderCount: { $sum: 1 },
                            },
                        },
                        { $sort: { _id: 1 } },
                    ],
                },
            },
        ]);
        const summary = salesData?.summary?.[0] || {};
        const saleCount = Number(summary.saleCount || 0);
        const stats = {
            orderCount: Number(summary.orderCount || 0),
            revenue: Number(summary.revenue || 0),
            averageOrder: saleCount ? Math.round(Number(summary.revenue || 0) / saleCount) : 0,
            pendingCount: Number(summary.pendingCount || 0),
            invoiceCount: Number(summary.invoiceCount || 0),
            dailySales: salesData?.dailySales || [],
        };

        return Response.json({ orders: orders.map(serializeOrder), counts: Object.fromEntries(countEntries), stats });
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
        const status = body.status === undefined ? undefined : String(body.status || '').trim();
        const isRead = body.isRead === undefined ? undefined : Boolean(body.isRead);
        const issueInvoice = body.action === 'issue-invoice';
        if (!orderId || (status !== undefined && !statuses.includes(status as typeof statuses[number])) || (!issueInvoice && status === undefined && isRead === undefined)) {
            return Response.json({ message: 'Đơn hàng hoặc trạng thái không hợp lệ.' }, { status: 400 });
        }

        await connectMongo();
        if (issueInvoice) {
            const existingOrder: any = await Order.findById(orderId).lean();
            if (!existingOrder) return Response.json({ message: 'Không tìm thấy đơn hàng.' }, { status: 404 });

            if (existingOrder.invoice?.number) {
                return Response.json({ message: 'Hóa đơn đã được lưu.', order: serializeOrder(existingOrder) });
            }
            if (existingOrder.status === 'cancelled') {
                return Response.json({ message: 'Không thể lập hóa đơn cho đơn hàng đã huỷ.' }, { status: 409 });
            }

            const issuedAt = new Date();
            const invoice = {
                number: `ECO-${issuedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${orderId.slice(-8).toUpperCase()}`,
                issuedAt,
                orderId,
                customer: {
                    name: existingOrder.customer?.name || '',
                    phone: existingOrder.customer?.phone || '',
                    address: existingOrder.customer?.address || '',
                },
                items: (existingOrder.items || []).map((item: any) => ({
                    productId: item.productId,
                    packageId: item.packageId,
                    name: item.name || 'Sản phẩm',
                    price: Number(item.price || 0),
                    quantity: Number(item.quantity || 0),
                    lineTotal: Number(item.price || 0) * Number(item.quantity || 0),
                })),
                subtotal: Number(existingOrder.total || 0),
                total: Number(existingOrder.total || 0),
                seller: { name: 'ECO-KIDS' },
            };

            let order: any = await Order.findOneAndUpdate(
                { _id: orderId, $or: [{ invoice: { $exists: false } }, { invoice: null }] },
                { $set: { invoice, updatedAt: issuedAt, isRead: true } },
                { new: true, runValidators: true },
            ).lean();
            const invoiceWasCreated = Boolean(order);
            if (!order) order = await Order.findById(orderId).lean();
            if (!order) return Response.json({ message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
            if (!invoiceWasCreated) {
                return Response.json({ message: 'Hóa đơn đã được lưu.', order: serializeOrder(order) });
            }

            await writeAuditLog({
                action: 'ORDER_INVOICE_ISSUE',
                resource: 'ORDER',
                resourceId: orderId,
                actor: { userId: user.id, email: user.email, role: user.role },
                request,
                metadata: { invoiceNumber: order.invoice?.number },
            });
            return Response.json({ message: 'Đã lưu hóa đơn bán hàng.', order: serializeOrder(order) });
        }

        const update: Record<string, unknown> = { updatedAt: new Date() };
        if (status !== undefined) {
            update.status = status;
            update.isRead = true;
        }
        if (isRead !== undefined) update.isRead = isRead;
        const order: any = await Order.findByIdAndUpdate(orderId, update, { new: true, runValidators: true }).lean();
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