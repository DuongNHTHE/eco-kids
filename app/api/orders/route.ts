import { createOrder } from '../../../src/store';
import { Product } from '../../../src/models';
import { connectMongo } from '../../../src/models';
import { writeAuditLog } from '../../../src/audit';

export async function POST(request: Request) {
  try {
    const { customer, items } = await request.json();
    if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || !items.length) {
      return Response.json({ message: 'Vui lòng nhập đủ thông tin giao hàng.' }, { status: 400 });
    }
    await connectMongo();
    const normalizedItems = (await Promise.all(items.map(async item => {
      const product: any = await Product.findOne({ slug: item.productId, isActive: true }).lean();
      if (!product) return null;
      const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      return { productId: product.slug, name: product.name, price: product.price, quantity };
    }))).filter(Boolean);
    if (!normalizedItems.length) return Response.json({ message: 'Sản phẩm không hợp lệ.' }, { status: 400 });
    const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await createOrder({ customer, items: normalizedItems, total });
    await writeAuditLog({
      action: 'ORDER_CREATE',
      resource: 'ORDER',
      resourceId: String(order._id || order.id),
      request,
      metadata: { itemCount: normalizedItems.length, total },
    });
    return Response.json({ message: 'Đặt hàng thành công!', orderId: order.id, total }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
