export const USER_ACTIVITY_TYPES = ['PAGE_VIEW', 'INTERACTION'] as const;
export const USER_ACTIVITY_TARGET_TYPES = ['LINK', 'BUTTON', 'OTHER'] as const;

export type UserActivityType = (typeof USER_ACTIVITY_TYPES)[number];
export type UserActivityTargetType = (typeof USER_ACTIVITY_TARGET_TYPES)[number];

export type UserActivityInput = {
  eventType: UserActivityType;
  path: string;
  targetType?: UserActivityTargetType;
  targetLabel?: string;
};

export function parseUserActivityInput(value: unknown): UserActivityInput | null {
  if (!value || typeof value !== 'object') return null;

  const input = value as Record<string, unknown>;
  if (!USER_ACTIVITY_TYPES.includes(input.eventType as UserActivityType)) return null;
  if (typeof input.path !== 'string' || !input.path.startsWith('/') || input.path.startsWith('//')) return null;
  if (input.path.includes('?') || input.path.includes('#') || input.path.length > 250) return null;

  let pathname: string;
  try {
    const url = new URL(input.path, 'https://eco-kids.invalid');
    if (url.origin !== 'https://eco-kids.invalid') return null;
    pathname = url.pathname;
  } catch {
    return null;
  }

  if (pathname === '/api' || pathname.startsWith('/api/')) return null;

  if (input.eventType === 'PAGE_VIEW') {
    return { eventType: 'PAGE_VIEW', path: pathname };
  }

  if (!USER_ACTIVITY_TARGET_TYPES.includes(input.targetType as UserActivityTargetType)) return null;
  const targetLabel = typeof input.targetLabel === 'string'
    ? input.targetLabel.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80)
    : '';

  return {
    eventType: 'INTERACTION',
    path: pathname,
    targetType: input.targetType as UserActivityTargetType,
    ...(targetLabel ? { targetLabel } : {}),
  };
}
