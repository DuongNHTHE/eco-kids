import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { Cart, connectMongo, Package, Product } from '../../../src/models';

type CartItemInput = { kind: 'product' | 'package'; id: string; quantity: number; topicId?: string; topicName?: string };
type StoredCartItem = { kind: 'product' | 'package'; itemId: string; quantity: number; topicId?: string; topicName?: string };
type CatalogItem = { slug: string; name: string; price: number };

async function getParent() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  return user?.id && user.role === 'PARENT' ? user : null;
}

async function hydrateItems(items: CartItemInput[]) {
  const productIds = items.filter(item => item.kind === 'product').map(item => item.id);
  const packageIds = items.filter(item => item.kind === 'package').map(item => item.id);
  const [products, packages] = await Promise.all([
    productIds.length ? Product.find({ slug: { $in: productIds }, isActive: true }).select('slug name price').lean() : [],
    packageIds.length ? Package.find({ slug: { $in: packageIds }, isActive: true }).select('slug name price').lean() : [],
  ]);
  const productsBySlug = new Map<string, CatalogItem>(
    (products as CatalogItem[]).map(product => [product.slug, product]),
  );
  const packagesBySlug = new Map<string, CatalogItem>(
    (packages as CatalogItem[]).map(pack => [pack.slug, pack]),
  );

  return items.map(item => {
    const catalogItem = item.kind === 'product'
      ? productsBySlug.get(item.id)
      : packagesBySlug.get(item.id);
    return catalogItem ? {
      id: item.id,
      kind: item.kind,
      name: catalogItem.name,
      price: Number(catalogItem.price),
      quantity: item.quantity,
      ...(item.topicId ? { topicId: item.topicId, topicName: item.topicName } : {}),
    } : null;
  });
}

export async function GET() {
  try {
    const user = await getParent();
    if (!user) return Response.json({ message: 'Vui lòng đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

    await connectMongo();
    const cart = await Cart.findOne({ userId: user.id }).select('items').lean() as { items?: StoredCartItem[] } | null;
    const items = (cart?.items || []).map(item => ({
      kind: item.kind,
      id: item.itemId,
      quantity: Number(item.quantity),
      topicId: item.topicId,
      topicName: item.topicName,
    })) as CartItemInput[];
    const hydratedItems = (await hydrateItems(items)).filter(Boolean);
    return Response.json({ items: hydratedItems });
  } catch (error) {
    console.error('parent cart load error', error);
    return Response.json({ message: 'Không thể tải giỏ hàng.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getParent();
    if (!user) return Response.json({ message: 'Vui lòng đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });

    const body = await request.json();
    if (!Array.isArray(body?.items) || body.items.length > 50) {
      return Response.json({ message: 'Danh sách sản phẩm trong giỏ hàng không hợp lệ.' }, { status: 400 });
    }

    const combinedItems = new Map<string, CartItemInput>();
    for (const item of body.items) {
      const kind = item?.kind;
      const id = typeof item?.id === 'string' ? item.id.trim() : '';
      const topicId = typeof item?.topicId === 'string' ? item.topicId.trim() : '';
      const topicName = typeof item?.topicName === 'string' ? item.topicName.trim() : '';
      const quantity = Number(item?.quantity);
      if (!['product', 'package'].includes(kind) || !id || id.length > 120 || topicId.length > 120 || topicName.length > 160 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return Response.json({ message: 'Sản phẩm hoặc số lượng trong giỏ hàng không hợp lệ.' }, { status: 400 });
      }

      const key = `${kind}:${id}:${topicId}`;
      const existing = combinedItems.get(key);
      const totalQuantity = (existing?.quantity || 0) + quantity;
      if (totalQuantity > 100) {
        return Response.json({ message: 'Số lượng mỗi sản phẩm không được vượt quá 100.' }, { status: 400 });
      }
      combinedItems.set(key, { kind, id, quantity: totalQuantity, ...(topicId ? { topicId, topicName } : {}) });
    }

    const items = [...combinedItems.values()];
    await connectMongo();
    const hydratedItems = await hydrateItems(items);
    if (hydratedItems.some(item => !item)) {
      return Response.json({ message: 'Một hoặc nhiều sản phẩm không còn khả dụng.' }, { status: 400 });
    }

    await Cart.collection.createIndex({ userId: 1 }, { unique: true });
    if (!items.length) {
      await Cart.deleteOne({ userId: user.id });
      return Response.json({ items: [] });
    }

    const cartItems = items.map(({ kind, id, quantity, topicId, topicName }) => ({
      kind,
      itemId: id,
      quantity,
      ...(topicId ? { topicId, topicName } : {}),
    }));
    try {
      await Cart.findOneAndUpdate(
        { userId: user.id },
        { $set: { items: cartItems } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      await Cart.updateOne({ userId: user.id }, { $set: { items: cartItems } }, { runValidators: true });
    }
    return Response.json({ items: hydratedItems });
  } catch (error) {
    console.error('parent cart save error', error);
    return Response.json({ message: 'Không thể lưu giỏ hàng.' }, { status: 500 });
  }
}
