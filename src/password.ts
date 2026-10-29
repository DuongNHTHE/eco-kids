import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const HASH_PREFIX = 'scrypt';

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt);
  return `${HASH_PREFIX}$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, storedPassword: string) {
  if (!storedPassword.startsWith(`${HASH_PREFIX}$`)) {
    const candidate = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    return candidate.length === stored.length && timingSafeEqual(candidate, stored);
  }

  const [, salt, storedHash] = storedPassword.split('$');
  if (!/^[a-f\d]{32}$/i.test(salt || '') || !/^[a-f\d]{128}$/i.test(storedHash || '')) return false;

  const expected = Buffer.from(storedHash, 'hex');
  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
