export const AUTH_KEY = 'eco-session';

export type AuthSession = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthSession;
    if (!data?.id || !data?.email || !data?.role) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_KEY);
}

export function resolveRoleHome(role: string) {
  if (!role) return '/login';
  switch (role) {
    case 'ADMIN':
    case 'TEACHER':
    case 'SCHOOL_ADMIN':
      return '/admin/dashboard';
    case 'PARENT':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

export function hasAccess(role: string | undefined, allowed: string[]) {
  return !!role && allowed.includes(role);
}
