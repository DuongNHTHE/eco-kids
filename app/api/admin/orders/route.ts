import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { writeAuditLog } from '../../../../src/audit';
import { connectMongo, Order } from '../../../../src/models';

const allowedRoles = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];
const statuses = ['new', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'] as const;

function parseDateOnly(value: string | null) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const calendarDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== value) return null;
    return new Date(`${value}T00:00:00.000+07:00`);
}

async function getAdminUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
    return user?.id && user.role && allowedRoles.includes(user.role) ? user : null;
}

function serializeOrder(order: any) {
    return {
        id: String(order._id || order.id),
        orderCode: order.orderCode || null,
        customer: order.customer || {},
        items: (order.items || []).map((item: any) => ({
            productId: item.productId,
            packageId: item.packageId,
            name: item.name || 'Sản phẩm',
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 0),
            ...(item.topicId ? { topicId: String(item.topicId) } : {}),
            ...(item.topicName ? { topicName: String(item.topicName) } : {}),
        })),
        total: Number(order.total || 0),
        status: order.status || 'new',
        paymentStatus: order.paymentStatus || 'pending',
        paymentConfirmedAt: order.paymentConfirmedAt || null,
        isRead: Boolean(order.isRead),
        paymentReceiptUploaded: Boolean(order.paymentReceipt?.uploadedAt),
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
        const paymentStatus = params.get('paymentStatus');
        const range = params.get('range') || '30';
        const fromParam = params.get('from');
        const toParam = params.get('to');
        const isReadParam = params.get('isRead');
        const fromDate = fromParam ? parseDateOnly(fromParam) : null;
        const toDate = toParam ? parseDateOnly(toParam) : null;
        if ((fromParam && !fromDate) || (toParam && !toDate) || (fromDate && toDate && fromDate > toDate)) {
            return Response.json({ message: 'Khoảng ngày không hợp lệ.' }, { status: 400 });
        }
        const dateQuery: Record<string, Date> = {};
        if (fromDate) dateQuery.$gte = fromDate;
        if (toDate) dateQuery.$lt = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
        const dateFilter = Object.keys(dateQuery).length ? { createdAt: dateQuery } : {};
        const query: Record<string, unknown> = {};
        if (status && statuses.includes(status as typeof statuses[number])) query.status = status;
        Object.assign(query, dateFilter);
        if (paymentStatus === 'confirmed') query.paymentStatus = 'confirmed';
        if (paymentStatus === 'pending') {
            query.$or = [{ paymentStatus: 'pending' }, { paymentStatus: null }];
        }
        if (isReadParam === 'true' || isReadParam === 'false') query.isRead = isReadParam === 'true';
        await connectMongo();
        const orders = await Order.find(query).select('-paymentReceipt.dataUrl').sort({ isRead: 1, createdAt: -1 }).limit(100).lean();
        const [countEntries, pendingPaymentCount, confirmedPaymentCount] = await Promise.all([
            Promise.all(statuses.map(async currentStatus => [currentStatus, await Order.countDocuments({ ...dateFilter, status: currentStatus })] as const)),
            Order.countDocuments({ ...dateFilter, $or: [{ paymentStatus: 'pending' }, { paymentStatus: null }] }),
            Order.countDocuments({ ...dateFilter, paymentStatus: 'confirmed' }),
        ]);

        const rangeDays = range === '7' || range === '30' || range === '90' ? Number(range) : null;
        const rangeMatch = Object.keys(dateQuery).length
            ? { createdAt: dateQuery }
            : rangeDays
                ? { createdAt: { $gte: new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000) } }
                : {};
        const chartInterval = fromDate && toDate && toDate.getTime() - fromDate.getTime() >= 62 * 24 * 60 * 60 * 1000
            ? 'month'
            : 'day';
        const chartDateFormat = chartInterval === 'month' ? '%Y-%m' : '%Y-%m-%d';
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
                        { $match: { status: { $ne: 'cancelled' } } },
                        {
                            $group: {
                                _id: {
                                    $dateToString: {
                                        format: chartDateFormat,
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

        return Response.json({
            orders: orders.map(serializeOrder),
            counts: Object.fromEntries(countEntries),
            paymentCounts: { pending: pendingPaymentCount, confirmed: confirmedPaymentCount },
            salesInterval: chartInterval,
            stats,
        });
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
        const confirmPayment = body.action === 'confirm-payment';
        if (!orderId || (status !== undefined && !statuses.includes(status as typeof statuses[number])) || (!issueInvoice && !confirmPayment && status === undefined && isRead === undefined)) {
            return Response.json({ message: 'Đơn hàng hoặc trạng thái không hợp lệ.' }, { status: 400 });
        }

        await connectMongo();
        if (confirmPayment) {
            const confirmedAt = new Date();
            const order: any = await Order.findOneAndUpdate(
                { _id: orderId, paymentStatus: { $ne: 'confirmed' } },
                {
                    $set: {
                        paymentStatus: 'confirmed',
                        paymentConfirmedAt: confirmedAt,
                        paymentConfirmedBy: user.id,
                        updatedAt: confirmedAt,
                        isRead: true,
                    },
                },
                { new: true, runValidators: true },
            ).select('-paymentReceipt.dataUrl').lean();
            if (!order) {
                const existingOrder = await Order.findById(orderId).select('-paymentReceipt.dataUrl').lean();
                if (!existingOrder) return Response.json({ message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
                return Response.json({ message: 'Khoản thanh toán đã được xác nhận.', order: serializeOrder(existingOrder) });
            }

            await writeAuditLog({
                action: 'ORDER_PAYMENT_CONFIRM',
                resource: 'ORDER',
                resourceId: orderId,
                actor: { userId: user.id, email: user.email, role: user.role },
                request,
                metadata: { paymentConfirmedAt: confirmedAt },
            });
            return Response.json({ message: 'Đã xác nhận thanh toán.', order: serializeOrder(order) });
        }

        if (issueInvoice) {
            const existingOrder: any = await Order.findById(orderId).select('-paymentReceipt.dataUrl').lean();
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
                    topicId: item.topicId,
                    topicName: item.topicName,
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
            ).select('-paymentReceipt.dataUrl').lean();
            const invoiceWasCreated = Boolean(order);
            if (!order) order = await Order.findById(orderId).select('-paymentReceipt.dataUrl').lean();
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
        const order: any = await Order.findByIdAndUpdate(orderId, update, { new: true, runValidators: true }).select('-paymentReceipt.dataUrl').lean();
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