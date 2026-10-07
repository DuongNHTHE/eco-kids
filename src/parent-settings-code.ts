import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

function deriveKey(code: string, salt: string) {
    return new Promise<Buffer>((resolve, reject) => {
        scrypt(code, salt, KEY_LENGTH, (error, key) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(key as Buffer);
        });
    });
}

export async function hashParentCode(code: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = await deriveKey(code, salt);
    return { salt, hash: hash.toString('hex') };
}

export async function verifyParentCode(code: string, salt: string, storedHash: string) {
    if (!/^[a-f\d]{32}$/i.test(salt) || !/^[a-f\d]{128}$/i.test(storedHash)) return false;
    const expected = Buffer.from(storedHash, 'hex');
    const actual = await deriveKey(code, salt);
    return timingSafeEqual(actual, expected);
}
