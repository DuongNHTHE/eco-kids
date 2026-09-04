type RouteContext = { params: Promise<{ word: string }> };

const QUICK_PRONOUNCE_URL = 'https://api.quickpronounce.site/v1/dictionary/';
const REQUEST_TIMEOUT_MS = 8000;

export async function GET(_request: Request, context: RouteContext) {
  const { word } = await context.params;
  const normalizedWord = word.trim();

  if (!normalizedWord) {
    return Response.json({ message: 'Vui lòng nhập từ tiếng Anh.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${QUICK_PRONOUNCE_URL}${encodeURIComponent(normalizedWord)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || payload?.success === false) {
      return Response.json({ message: 'Không tìm thấy từ này trong từ điển.' }, { status: response.status || 404 });
    }

    const data = payload?.data;
    const phonetic = data?.phonetics?.us || data?.phonetics?.uk || '';
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    const example = entries.flatMap((entry: any) => Array.isArray(entry.examples) ? entry.examples : []).find(Boolean) || '';

    return Response.json([{ word: data?.word || normalizedWord, phonetic, phonetics: phonetic ? [{ text: phonetic }] : [], meanings: [{ definitions: example ? [{ example }] : [] }] }]);
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'QuickPronounce API phản hồi quá lâu.'
      : 'Không thể kết nối đến QuickPronounce API.';
    return Response.json({ message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
