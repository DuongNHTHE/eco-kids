const BANK_ID = process.env.PAYMENT_BANK_ID || '970436';
const BANK_NAME = process.env.PAYMENT_BANK_NAME || 'Vietcombank';
const ACCOUNT_NUMBER = process.env.PAYMENT_ACCOUNT_NUMBER || '188688788';

export type OrderPayment = {
    bankName: string;
    bankId: string;
    accountNumber: string;
    amount: number;
    transferContent: string;
    qrUrl: string;
};

export function createOrderPayment(orderId: string, amount: number): OrderPayment {
    const orderReference = orderId.replace(/[^a-z\d]/gi, '').slice(-8).toUpperCase();
    const transferContent = `ECO KIDS ${orderReference}`;
    const qrUrl = new URL(`https://img.vietqr.io/image/BIDV-880419666-compact2.png`);
    qrUrl.searchParams.set('amount', String(Math.round(amount)));
    qrUrl.searchParams.set('addInfo', transferContent);

    return {
        bankName: BANK_NAME,
        bankId: BANK_ID,
        accountNumber: ACCOUNT_NUMBER,
        amount,
        transferContent,
        qrUrl: qrUrl.toString(),
    };
}

export function isSupportedPaymentReceipt(bytes: Buffer, contentType: string): boolean {
    if (contentType === 'image/jpeg') {
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (contentType === 'image/png') {
        return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    if (contentType === 'image/webp') {
        return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    }
    return false;
}
