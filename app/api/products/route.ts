import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { writeAuditLog } from '../../../src/audit';
import { connectMongo, Product } from '../../../src/models';
import { getProducts } from '../../../src/content';

const adminRoles = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];

async function getAdminUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  return user?.id && user.role && adminRoles.includes(user.role) ? user : null;
}

function normalizeProduct(body: any) {
  const slug = String(body.slug || '').trim().toLowerCase();
  const name = String(body.name || '').trim();

  return {
    sku: String(body.sku || '').trim().toUpperCase(),
    slug,
    name,
    description: String(body.description || '').trim(),
    imageUrl: String(body.imageUrl || '').trim(),
    modelUrl: String(body.modelUrl || '').trim(),
    price: Number(body.price),
    stock: Math.max(0, Math.floor(Number(body.stock) || 0)),
    isActive: body.isActive !== false,
  };
}

function validateProduct(product: ReturnType<typeof normalizeProduct>) {
  if (!product.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)) return 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang.';
  if (!product.sku) return 'SKU sản phẩm là bắt buộc.';
  if (!product.name) return 'Tên sản phẩm là bắt buộc.';
  if (!Number.isFinite(product.price) || product.price < 0) return 'Giá sản phẩm không hợp lệ.';
  return null;
}

export async function GET() {
  return Response.json(await getProducts());
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({ message: 'Bạn không có quyền quản lý sản phẩm.' }, { status: 403 });

  try {
    const product = normalizeProduct(await request.json());
    const validationError = validateProduct(product);
    if (validationError) return Response.json({ message: validationError }, { status: 400 });

    await connectMongo();
    const created = await Product.create(product);
    await writeAuditLog({
      action: 'PRODUCT_CREATE',
      resource: 'PRODUCT',
      resourceId: created.slug,
      actor: { userId: user.id, email: user.email, role: user.role },
      request,
      metadata: { name: created.name, price: created.price },
    });
    return Response.json({ message: 'Đã thêm sản phẩm.', product: { ...created.toObject(), id: created.slug } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) return Response.json({ message: 'Slug sản phẩm đã tồn tại.' }, { status: 409 });
    console.error('product create error', error);
    return Response.json({ message: 'Không thể thêm sản phẩm.' }, { status: 500 });
  }
}
