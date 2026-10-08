import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { connectMongo, Order } from '../../../../../src/models';
import { isSupportedPaymentReceipt } from '../../../../../src/order-payment';

const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;
const ADMIN_ROLES = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== 'PARENT') {
      return Response.json({ message: 'Vui lòng đăng nhập bằng tài khoản phụ huynh.' }, { status: 401 });
    }

    const { orderId } = await params;
    if (!mongoose.isValidObjectId(orderId)) {
      return Response.json({ message: 'Mã đơn hàng không hợp lệ.' }, { status: 400 });
    }

    const formData = await request.formData();
    const receipt = formData.get('receipt');
    if (!(receipt instanceof File) || receipt.size === 0) {
      return Response.json({ message: 'Vui lòng chọn ảnh bill chuyển khoản.' }, { status: 400 });
    }
    if (receipt.size > MAX_RECEIPT_SIZE) {
      return Response.json({ message: 'Ảnh bill không được vượt quá 4 MB.' }, { status: 413 });
    }

    const bytes = Buffer.from(await receipt.arrayBuffer());
    if (!isSupportedPaymentReceipt(bytes, receipt.type)) {
      return Response.json({ message: 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ.' }, { status: 400 });
    }

    await connectMongo();
    const order = await Order.findOneAndUpdate(
      { _id: orderId, user_id: user.id, status: { $ne: 'cancelled' } },
      {
        $set: {
          paymentReceipt: {
            dataUrl: `data:${receipt.type};base64,${bytes.toString('base64')}`,
            contentType: receipt.type,
            uploadedAt: new Date(),
          },
        },
      },
      { new: true },
    ).select('_id');

    if (!order) return Response.json({ message: 'Không tìm thấy đơn hàng hoặc đơn đã bị huỷ.' }, { status: 404 });
    return Response.json({ message: 'Đã lưu ảnh bill thanh toán.' }, { status: 200 });
  } catch (error) {
    console.error('order payment receipt upload error', error);
    return Response.json({ message: 'Không thể lưu ảnh bill. Vui lòng thử lại.' }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || !user.role || !ADMIN_ROLES.includes(user.role)) {
      return Response.json({ message: 'Bạn không có quyền xem ảnh bill.' }, { status: 403 });
    }

    const { orderId } = await params;
    if (!mongoose.isValidObjectId(orderId)) {
      return Response.json({ message: 'Mã đơn hàng không hợp lệ.' }, { status: 400 });
    }

    await connectMongo();
    const order = await Order.findById(orderId).select('paymentReceipt').lean() as {
      paymentReceipt?: { dataUrl?: string; uploadedAt?: Date };
    } | null;
    if (!order?.paymentReceipt?.dataUrl) {
      return Response.json({ message: 'Đơn hàng chưa có ảnh bill.' }, { status: 404 });
    }
    return Response.json({
      dataUrl: order.paymentReceipt.dataUrl,
      uploadedAt: order.paymentReceipt.uploadedAt,
    });
  } catch (error) {
    console.error('order payment receipt query error', error);
    return Response.json({ message: 'Không thể tải ảnh bill.' }, { status: 500 });
  }
}
