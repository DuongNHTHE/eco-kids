'use client';

import { useState, type FormEvent } from 'react';
import { useAPI } from '../lib/hooks/useAPI';

export type OrderPayment = {
    bankName: string;
    bankId: string;
    accountNumber: string;
    amount: number;
    transferContent: string;
    qrUrl: string;
};

const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';

export function OrderPaymentStep({ orderId, payment, onUploaded }: {
    orderId: string;
    payment: OrderPayment;
    onUploaded?: () => void;
}) {
    const { API } = useAPI();
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);

    async function uploadReceipt(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const fileInput = form.elements.namedItem('receipt');
        const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;
        if (!file) {
            setMessage('Vui lòng chọn ảnh bill chuyển khoản.');
            return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_RECEIPT_SIZE) {
            setMessage('Chỉ nhận ảnh JPG, PNG hoặc WebP có dung lượng tối đa 4 MB.');
            return;
        }

        setUploading(true);
        setMessage('Đang gửi ảnh bill...');
        const result = await API.post(`orders/${orderId}/payment-receipt`, new FormData(form), false, true, true);
        setUploading(false);
        if (result?.success) {
            setUploaded(true);
            setMessage('Đã gửi ảnh bill thành công. Cửa hàng sẽ kiểm tra thanh toán.');
            onUploaded?.();
        } else {
            setMessage(result?.message || 'Không thể gửi ảnh bill. Vui lòng thử lại.');
        }
    }

    return (
        <div className="mt-4">
            <div className="rounded-2xl border border-[#dceadd] bg-[#f4faf4] p-4">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <img
                        src={payment.qrUrl}
                        alt={`Mã QR thanh toán ${money(payment.amount)} qua ${payment.bankName}`}
                        className="h-52 w-52 rounded-xl border border-[#dceadd] bg-white object-contain p-2"
                    />
                    <div className="w-full text-sm">
                        <h4 className="text-base font-extrabold text-[#203b35]">Quét QR để chuyển khoản</h4>
                        <p className="mt-2 text-[#71867c]">Ngân hàng: <b className="text-[#203b35]">{payment.bankName}</b></p>
                        <p className="mt-1 text-[#71867c]">Số tài khoản: <b className="text-[#203b35]">{payment.accountNumber}</b></p>
                        <p className="mt-1 text-[#71867c]">Số tiền: <b className="text-[#203b35]">{money(payment.amount)}</b></p>
                        <p className="mt-1 break-all text-[#71867c]">Nội dung: <b className="text-[#203b35]">{payment.transferContent}</b></p>
                        <p className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-[#71867c]">
                            Vui lòng chuyển đúng số tiền và nội dung trên, sau đó gửi ảnh bill chuyển khoản để hoàn tất.
                        </p>
                    </div>
                </div>
            </div>

            {uploaded ? (
                <p role="status" className="mt-4 rounded-xl bg-[#e9f3eb] p-3 text-sm font-bold text-[#2d6358]">{message}</p>
            ) : (
                <form onSubmit={uploadReceipt} className="mt-4 space-y-3 rounded-2xl border border-[#dceadd] bg-white p-4">
                    <label className="block text-sm font-bold text-[#203b35]">
                        Ảnh bill chuyển khoản (JPG, PNG hoặc WebP · tối đa 4 MB)
                        <input
                            required
                            type="file"
                            name="receipt"
                            accept="image/jpeg,image/png,image/webp"
                            className="mt-2 block w-full text-sm text-[#71867c] file:mr-3 file:rounded-full file:border-0 file:bg-[#e9f3eb] file:px-4 file:py-2 file:font-bold file:text-[#2d6358]"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="w-full rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white disabled:opacity-60"
                    >
                        {uploading ? 'Đang gửi ảnh...' : 'Gửi ảnh bill thanh toán'}
                    </button>
                    {message && <p role="status" className="text-sm text-[#526d64]">{message}</p>}
                </form>
            )}
        </div>
    );
}
