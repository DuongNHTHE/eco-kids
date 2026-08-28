export type AvailableLanguage = 'en' | 'vi';

import en from '../locales/en.json';
import vi from '../locales/vi.json';

export const STORAGE_KEY = 'app-lang';
export const DEFAULT_LANGUAGE: AvailableLanguage = 'en';

export const supportedLanguages: AvailableLanguage[] = ['en', 'vi'];

export const languageLabels: Record<AvailableLanguage, string> = {
    en: 'English',
    vi: 'Tiếng Việt',
};

const messages: Record<AvailableLanguage, Record<string, string>> = {
    en,
    vi,
};

export function isAvailableLanguage(value: unknown): value is AvailableLanguage {
    return value === 'en' || value === 'vi';
}

export function getStoredLanguage(): AvailableLanguage {
    if (globalThis.window === undefined) return DEFAULT_LANGUAGE;

    const saved = globalThis.localStorage.getItem(STORAGE_KEY) as AvailableLanguage | null;
    if (saved && isAvailableLanguage(saved)) {
        return saved;
    }

    return DEFAULT_LANGUAGE;
}

export function setStoredLanguage(lang: string): AvailableLanguage {
    const normalized = (lang || '').toLowerCase() as AvailableLanguage;
    const language = isAvailableLanguage(normalized) ? normalized : DEFAULT_LANGUAGE;

    if (globalThis.window !== undefined) {
        globalThis.localStorage.setItem(STORAGE_KEY, language);
    }

    return language;
}

export function translate(key: string, lang?: AvailableLanguage): string {
    const activeLang = lang || getStoredLanguage();
    return messages[activeLang]?.[key] ?? messages[DEFAULT_LANGUAGE]?.[key] ?? key;
}
