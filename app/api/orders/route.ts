import { products } from '../../../src/data';
import { createOrder } from '../../../src/store';

export async function POST(request: Request) {
  try {
    const { customer, items } = await request.json();
    if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || !items.length) {
      return Response.json({ message: 'Vui lòng nhập đủ thông tin giao hàng.' }, { status: 400 });
    }
    const normalizedItems = items.map(item => {
      const product = products.find(productItem => productItem.id === item.productId);
      if (!product) return null;
      const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      return { productId: product.id, name: product.name, price: product.price, quantity };
    }).filter(Boolean);
    if (!normalizedItems.length) return Response.json({ message: 'Sản phẩm không hợp lệ.' }, { status: 400 });
    const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await createOrder({ customer, items: normalizedItems, total });
    return Response.json({ message: 'Đặt hàng thành công!', orderId: order._id, total }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
