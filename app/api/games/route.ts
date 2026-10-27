import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import {
  DEFAULT_LISTEN_AND_MATCH_CONFIG,
  DEFAULT_MEMORY_MATCH_CONFIG,
  LISTEN_AND_MATCH_ID,
  MEMORY_MATCH_ID,
} from '../../../src/game-config';
import { connectMongo, GameConfig } from '../../../src/models';

type SessionUser = { id?: string; role?: string | null };
type GameItem = {
  id: string;
  name: string;
  translation: string;
  emoji: string;
  imageUrl: string;
};

async function getUser() {
  const session = await getServerSession(authOptions);
  return session?.user as SessionUser | undefined;
}

function isAdmin(user?: SessionUser) {
  return Boolean(user?.id && ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'].includes(user.role || ''));
}

function serializeConfig(config: any) {
  return {
    gameId: config.gameId,
    title: config.title,
    description: config.description || '',
    icon: config.icon || '🎧',
    isActive: config.isActive !== false,
    themes: (config.themes || []).map((theme: any) => ({
      id: theme.id,
      title: theme.title,
      items: (theme.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        translation: item.translation || '',
        emoji: item.emoji || '✨',
        imageUrl: item.imageUrl || '',
      })),
    })),
  };
}

function isSafeImageUrl(value: string) {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function normalizeConfig(body: any) {
  const title = String(body?.title || '').trim();
  const description = String(body?.description || '').trim();
  const isMemoryMatch = body?.gameId === MEMORY_MATCH_ID;
  const icon = String(body?.icon || (isMemoryMatch ? '🧠' : '🎧')).trim();
  if (![LISTEN_AND_MATCH_ID, MEMORY_MATCH_ID].includes(body?.gameId)) {
    return { error: 'Mã trò chơi không hợp lệ.' };
  }
  if (!title || title.length > 100 || description.length > 300 || !icon || icon.length > 12) {
    return { error: 'Tên, mô tả hoặc biểu tượng trò chơi không hợp lệ.' };
  }
  if (typeof body?.isActive !== 'boolean' || !Array.isArray(body?.themes) || body.themes.length > 20) {
    return { error: 'Cấu hình trò chơi không hợp lệ.' };
  }
  if (body.isActive && body.themes.length === 0) {
    return { error: 'Hãy thêm ít nhất một chủ đề trước khi mở trò chơi.' };
  }

  const themeIds = new Set<string>();
  const themes: Array<{ id: string; title: string; items: GameItem[] }> = [];
  for (const theme of body.themes) {
    const id = String(theme?.id || '').trim();
    const themeTitle = String(theme?.title || '').trim();
    if (!id || id.length > 80 || themeIds.has(id) || !themeTitle || themeTitle.length > 80) {
      return { error: 'Mỗi chủ đề cần có mã và tên riêng hợp lệ.' };
    }
    const minItems = isMemoryMatch ? 3 : 2;
    if (!Array.isArray(theme?.items) || theme.items.length < minItems || theme.items.length > 20) {
      return { error: `Chủ đề "${themeTitle}" cần có từ ${minItems} đến 20 hình ảnh.` };
    }
    themeIds.add(id);

    const itemIds = new Set<string>();
    const items: GameItem[] = [];
    for (const item of theme.items) {
      const itemId = String(item?.id || '').trim();
      const name = String(item?.name || '').trim();
      const translation = String(item?.translation || '').trim();
      const emoji = String(item?.emoji || '✨').trim();
      const imageUrl = String(item?.imageUrl || '').trim();
      if (!itemId || itemId.length > 80 || itemIds.has(itemId) || !name || name.length > 60
        || translation.length > 60 || emoji.length > 12 || imageUrl.length > 500 || !isSafeImageUrl(imageUrl)) {
        return { error: `Thông tin hình ảnh trong chủ đề "${themeTitle}" không hợp lệ.` };
      }
      itemIds.add(itemId);
      items.push({ id: itemId, name, translation, emoji, imageUrl });
    }
    themes.push({ id, title: themeTitle, items });
  }

  return {
    value: {
      gameId: body.gameId,
      title,
      description,
      icon,
      isActive: body.isActive,
      themes,
    },
  };
}

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user?.id) return Response.json({ message: 'Cần đăng nhập để xem trò chơi.' }, { status: 401 });
    if (user.role !== 'PARENT' && !isAdmin(user)) {
      return Response.json({ message: 'Bạn không có quyền xem trò chơi.' }, { status: 403 });
    }

    const gameId = new URL(request.url).searchParams.get('gameId') || LISTEN_AND_MATCH_ID;
    const defaults = gameId === MEMORY_MATCH_ID
      ? DEFAULT_MEMORY_MATCH_CONFIG
      : gameId === LISTEN_AND_MATCH_ID
        ? DEFAULT_LISTEN_AND_MATCH_CONFIG
        : null;
    if (!defaults) return Response.json({ message: 'Mã trò chơi không hợp lệ.' }, { status: 400 });

    await connectMongo();
    const config = await GameConfig.findOneAndUpdate(
      { gameId },
      { $setOnInsert: defaults },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const serialized = serializeConfig(config);
    return Response.json({ game: user.role === 'PARENT' && !serialized.isActive ? null : serialized });
  } catch (error) {
    console.error('[games] GET failed:', error);
    return Response.json({ message: 'Không thể tải cấu hình trò chơi.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUser();
    if (!isAdmin(user)) return Response.json({ message: 'Bạn không có quyền quản lý trò chơi.' }, { status: 403 });

    const normalized = normalizeConfig(await request.json());
    if (normalized.error) return Response.json({ message: normalized.error }, { status: 400 });

    await connectMongo();
    const config = await GameConfig.findOneAndUpdate(
      { gameId: normalized.value.gameId },
      { $set: { ...normalized.value, updatedAt: new Date() } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    return Response.json({ game: serializeConfig(config), message: 'Đã lưu cấu hình trò chơi.' });
  } catch (error) {
    console.error('[games] PUT failed:', error);
    return Response.json({ message: 'Không thể lưu cấu hình trò chơi.' }, { status: 500 });
  }
}
