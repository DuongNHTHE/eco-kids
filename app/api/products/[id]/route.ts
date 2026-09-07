import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { writeAuditLog } from '../../../../src/audit';
import { connectMongo, Product } from '../../../../src/models';

const adminRoles = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];

async function getAdminUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  return user?.id && user.role && adminRoles.includes(user.role) ? user : null;
}

function normalizeProduct(body: any) {
  return {
    sku: String(body.sku || '').trim().toUpperCase(),
    slug: String(body.slug || '').trim().toLowerCase(),
    name: String(body.name || '').trim(),
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

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const user = await getAdminUser();
  if (!user) return Response.json({ message: 'Bạn không có quyền quản lý sản phẩm.' }, { status: 403 });

  try {
    const { id } = await context.params;
    const product = normalizeProduct(await request.json());
    const validationError = validateProduct(product);
    if (validationError) return Response.json({ message: validationError }, { status: 400 });

    await connectMongo();
    const updated: any = await Product.findOneAndUpdate({ slug: id }, product, { new: true, runValidators: true }).lean();
    if (!updated) return Response.json({ message: 'Không tìm thấy sản phẩm.' }, { status: 404 });
    await writeAuditLog({
      action: 'PRODUCT_UPDATE',
      resource: 'PRODUCT',
      resourceId: updated.slug,
      actor: { userId: user.id, email: user.email, role: user.role },
      request,
      metadata: { name: updated.name, price: updated.price },
    });
    return Response.json({ message: 'Đã cập nhật sản phẩm.', product: { ...updated, id: updated.slug } });
  } catch (error: any) {
    if (error?.code === 11000) return Response.json({ message: 'Slug sản phẩm đã tồn tại.' }, { status: 409 });
    console.error('product update error', error);
    return Response.json({ message: 'Không thể cập nhật sản phẩm.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getAdminUser();
  if (!user) return Response.json({ message: 'Bạn không có quyền quản lý sản phẩm.' }, { status: 403 });

  try {
    const { id } = await context.params;
    await connectMongo();
    const deleted: any = await Product.findOneAndDelete({ slug: id }).lean();
    if (!deleted) return Response.json({ message: 'Không tìm thấy sản phẩm.' }, { status: 404 });
    await writeAuditLog({
      action: 'PRODUCT_DELETE',
      resource: 'PRODUCT',
      resourceId: id,
      actor: { userId: user.id, email: user.email, role: user.role },
      request,
      metadata: { name: deleted.name },
    });
    return Response.json({ message: 'Đã xóa sản phẩm.' });
  } catch (error) {
    console.error('product delete error', error);
    return Response.json({ message: 'Không thể xóa sản phẩm.' }, { status: 500 });
  }
}