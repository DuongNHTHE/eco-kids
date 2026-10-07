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
