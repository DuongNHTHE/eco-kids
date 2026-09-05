import { connectMongo, Order, Partner, Progress } from '../../../../src/models';
import { getTopics } from '../../../../src/content';

function startOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatTime(value: Date | string) {
    return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export async function GET() {
    try {
        await connectMongo();
        const [progress, orders, partners, topics] = await Promise.all([
            Progress.find().sort({ practicedAt: -1 }).lean(),
            Order.find().sort({ createdAt: -1 }).lean(),
            Partner.find().sort({ createdAt: -1 }).lean(),
            getTopics(),
        ]);

        const monthStart = startOfMonth();
        const monthOrders = orders.filter(order => new Date(order.createdAt || 0) >= monthStart);
        const revenue = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const students = new Set(progress.map(item => item.childName).filter(Boolean)).size;
        const completed = progress.filter(item => Number(item.score || 0) >= 80).length;

        const lessons = (topics as any[]).map(topic => {
            const topicProgress = progress.filter(item => item.topicId === topic.id);
            const progressPercent = topic.words?.length
                ? Math.min(100, Math.round((new Set(topicProgress.map(item => item.wordId)).size / topic.words.length) * 100))
                : 0;
            return {
                title: topic.title,
                progress: progressPercent,
                lessons: topic.words?.length || 0,
                color: topic.color || '#6eaa83',
            };
        });

        const today = new Date();
        const trend = Array.from({ length: 7 }, (_, index) => {
            const day = new Date(today);
            day.setHours(0, 0, 0, 0);
            day.setDate(today.getDate() - (6 - index));
            const nextDay = new Date(day);
            nextDay.setDate(day.getDate() + 1);
            return {
                label: `T${index + 1}`,
                value: progress.filter(item => {
                    const practicedAt = new Date(item.practicedAt || item.createdAt || 0);
                    return practicedAt >= day && practicedAt < nextDay;
                }).length,
            };
        });
        const maxTrend = Math.max(...trend.map(item => item.value), 1);

        const recentOrders = orders.slice(0, 5).map(order => ({
            id: String(order._id || order.id || '').slice(-8),
            customer: order.customer?.name || 'Khách hàng',
            total: formatCurrency(Number(order.total || 0)),
            status: order.status || 'new',
        }));

        const activities = [
            ...orders.slice(0, 3).map(order => ({
                id: `order-${order._id}`,
                time: formatTime(order.createdAt),
                title: 'Đơn hàng mới được tạo',
                detail: `${order.customer?.name || 'Khách hàng'} · ${formatCurrency(Number(order.total || 0))}`,
            })),
            ...partners.slice(0, 2).map(partner => ({
                id: `partner-${partner._id}`,
                time: formatTime(partner.createdAt),
                title: 'Khách hàng đăng ký tư vấn',
                detail: `${partner.organization} · ${partner.contactName}`,
            })),
            ...progress.slice(0, 3).map(item => ({
                id: `progress-${item._id}`,
                time: formatTime(item.practicedAt || item.createdAt),
                title: 'Cập nhật tiến độ học tập',
                detail: `${item.childName} · ${item.topicId}`,
            })),
        ].sort((left, right) => right.time.localeCompare(left.time)).slice(0, 6);

        return Response.json({
            stats: [
                { label: 'Học sinh đang học', value: students.toLocaleString('vi-VN'), delta: `${progress.length} lượt học`, accent: '#f47d52', icon: '👧' },
                { label: 'Bài học hoàn tất', value: completed.toLocaleString('vi-VN'), delta: `${progress.length} lượt ghi nhận`, accent: '#6eaa83', icon: '✅' },
                { label: 'Doanh thu tháng', value: formatCurrency(revenue), delta: `${monthOrders.length} đơn hàng`, accent: '#f5b83d', icon: '💰' },
                { label: 'Trường hợp tác', value: partners.length.toLocaleString('vi-VN'), delta: 'Tổng đăng ký', accent: '#2d6358', icon: '🏫' },
            ],
            lessons,
            trend: trend.map(item => ({ ...item, value: Math.round((item.value / maxTrend) * 100) })),
            orders: recentOrders,
            activities,
        });
    } catch (error) {
        console.error(error);
        return Response.json({ message: 'Không thể tải dữ liệu dashboard.' }, { status: 500 });
    }
}
