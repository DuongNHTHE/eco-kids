import { Order, Package, Product } from '../../../src/models';
import { connectMongo } from '../../../src/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { writeAuditLog } from '../../../src/audit';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    const { customer, items } = await request.json();
    if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || !items.length) {
      return Response.json({ message: 'Vui lòng nhập đủ thông tin giao hàng.' }, { status: 400 });
    }
    const authSession = await getServerSession(authOptions);
    const user = authSession?.user as { id?: string; email?: string | null; role?: string } | undefined;
    if (user?.role !== 'PARENT' || !user.id) return Response.json({ message: 'Vui lòng đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });
    console.log(user);
    await connectMongo();
    const stockRequirements = new Map<string, number>();
    const normalizedItems = (await Promise.all(items.map(async item => {
      const itemId = String(item.packageId || item.productId || '');
      const pack: any = item.packageId
        ? await Package.findOne({ slug: itemId, isActive: true }).lean()
        : null;
      const product: any = !pack
        ? await Product.findOne({ slug: itemId, isActive: true }).lean()
        : null;
      const catalogItem = pack || product;
      if (!catalogItem) return null;
      const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      if (pack) {
        pack.items?.forEach((packItem: { productId?: string; quantity?: number }) => {
          if (packItem.productId) {
            stockRequirements.set(
              packItem.productId,
              (stockRequirements.get(packItem.productId) || 0) + quantity * Math.max(1, Number(packItem.quantity) || 1),
            );
          }
        });
      } else {
        stockRequirements.set(itemId, (stockRequirements.get(itemId) || 0) + quantity);
      }
      return {
        ...(pack ? { packageId: pack.slug } : { productId: product.slug }),
        name: catalogItem.name,
        price: catalogItem.price,
        quantity,
      };
    }))).filter(Boolean);
    if (!normalizedItems.length) return Response.json({ message: 'Sản phẩm không hợp lệ.' }, { status: 400 });
    const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const dbSession = await mongoose.connection.startSession();
    let order: any;
    try {
      await dbSession.withTransaction(async () => {
        for (const [slug, quantity] of stockRequirements) {
          const updated = await Product.findOneAndUpdate(
            { slug, isActive: true, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true, session: dbSession },
          ).lean();
          if (!updated) {
            const error = new Error(`Sản phẩm ${slug} không đủ tồn kho.`) as Error & { status?: number };
            error.status = 409;
            throw error;
          }
        }
        const created = await Order.create([{ user_id: user.id, customer, items: normalizedItems, total }], { session: dbSession });
        order = created[0];
      });
    } catch (error: any) {
      if (error?.status === 409) return Response.json({ message: error.message }, { status: 409 });
      throw error;
    } finally {
      await dbSession.endSession();
    }
    await writeAuditLog({
      action: 'ORDER_CREATE',
      resource: 'ORDER',
      resourceId: String(order._id || order.id),
      actor: user?.id ? { userId: user.id, email: user.email, role: user.role } : undefined,
      request,
      metadata: { itemCount: normalizedItems.length, total },
    });
    return Response.json({ message: 'Đặt hàng thành công!', orderId: order.id, total }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id) return Response.json({ message: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.' }, { status: 401 });
    if (user.role !== 'PARENT') return Response.json({ message: 'Chỉ tài khoản phụ huynh được xem lịch sử đơn hàng.' }, { status: 403 });

    await connectMongo();
    const orders = await Order.find({ user_id: user.id }).sort({ createdAt: -1 }).lean();
    return Response.json(orders.map((order: any) => ({
      id: String(order._id || order.id),
      customer: order.customer,
      items: order.items || [],
      total: Number(order.total || 0),
      status: order.status || 'new',
      createdAt: order.createdAt,
    })));
  } catch (error) {
    console.error('parent order history error', error);
    return Response.json({ message: 'Không thể tải lịch sử đơn hàng.' }, { status: 500 });
  }
}
