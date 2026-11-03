import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { connectMongo, User } from '../src/models';

const USER_COUNT = 200;
const DEFAULT_FILE = 'seed-users.json';

type SeedUser = {
  username: string;
  email: string;
  password: string;
  name: string;
  role: 'PARENT';
  createdAt: string;
  updatedAt: string;
};

function parseArgs(args: string[]) {
  let dateValue: string | undefined;
  let filePath = DEFAULT_FILE;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--date') {
      dateValue = args[++index];
      if (!dateValue) throw new Error('Thiếu giá trị cho --date.');
    } else if (argument.startsWith('--date=')) {
      dateValue = argument.slice('--date='.length);
    } else if (argument === '--file') {
      filePath = args[++index] || '';
      if (!filePath) throw new Error('Thiếu giá trị cho --file.');
    } else if (argument.startsWith('--file=')) {
      filePath = argument.slice('--file='.length);
    } else {
      throw new Error(`Tham số không được hỗ trợ: ${argument}`);
    }
  }

  if (!filePath.trim()) throw new Error('Đường dẫn file không được để trống.');

  let createdAt: Date | undefined;
  if (dateValue) {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
    if (!isDateOnly && !/^\d{4}-\d{2}-\d{2}T/.test(dateValue)) {
      throw new Error('Ngày phải theo định dạng YYYY-MM-DD hoặc ISO 8601.');
    }

    createdAt = new Date(isDateOnly ? `${dateValue}T00:00:00.000Z` : dateValue);
    if (Number.isNaN(createdAt.getTime()) || (isDateOnly && createdAt.toISOString().slice(0, 10) !== dateValue)) {
      throw new Error('Ngày tạo user không hợp lệ.');
    }
  }

  return { createdAt, filePath: resolve(process.cwd(), filePath) };
}

function validateUsers(data: unknown): SeedUser[] {
  if (!Array.isArray(data) || data.length !== USER_COUNT) {
    throw new Error(`File seed phải chứa đúng ${USER_COUNT} user.`);
  }

  const usernames = new Set<string>();
  const emails = new Set<string>();
  for (const [index, user] of data.entries()) {
    if (!user || typeof user !== 'object') throw new Error(`User thứ ${index + 1} không hợp lệ.`);
    const record = user as Partial<SeedUser>;
    if (
      typeof record.username !== 'string'
      || !/^[a-z0-9._-]{3,30}$/.test(record.username)
      || typeof record.email !== 'string'
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)
      || typeof record.password !== 'string'
      || !/^scrypt\$[a-f\d]{32}\$[a-f\d]{128}$/i.test(record.password)
      || typeof record.name !== 'string'
      || record.role !== 'PARENT'
      || typeof record.createdAt !== 'string'
      || Number.isNaN(Date.parse(record.createdAt))
    ) {
      throw new Error(`Thông tin user thứ ${index + 1} không hợp lệ.`);
    }
    if (usernames.has(record.username) || emails.has(record.email)) {
      throw new Error(`Username hoặc email bị trùng tại user thứ ${index + 1}.`);
    }
    usernames.add(record.username);
    emails.add(record.email);
  }

  return data as SeedUser[];
}

async function main() {
  const { createdAt, filePath } = parseArgs(process.argv.slice(2));
  const rawData = await readFile(filePath, 'utf8');
  const users = validateUsers(JSON.parse(rawData));
  const operations = users.map(user => {
    const timestamp = createdAt || new Date(user.createdAt);
    return {
      updateOne: {
        filter: { email: user.email },
        update: {
          $set: {
            username: user.username,
            email: user.email,
            password: user.password,
            name: user.name,
            role: user.role,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        },
        upsert: true,
      },
    };
  });

  await connectMongo();
  const result = await User.bulkWrite(operations, { ordered: false });
  console.log(`Đã import ${users.length} user từ ${filePath}.`);
  console.log(`Tạo mới: ${result.upsertedCount}; cập nhật: ${result.modifiedCount}.`);
  if (createdAt) console.log(`Ngày tạo được áp dụng: ${createdAt.toISOString()}`);
}

main().catch(error => {
  console.error('Không thể import seed users:', error);
  process.exitCode = 1;
});
