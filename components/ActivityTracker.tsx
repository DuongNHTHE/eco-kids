'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

type ActivityEvent = {
  eventType: 'PAGE_VIEW' | 'INTERACTION';
  path: string;
  targetType?: 'LINK' | 'BUTTON' | 'OTHER';
  targetLabel?: string;
};

async function sendActivity(event: ActivityEvent) {
  try {
    const response = await fetch('/api/user-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    });

    if (!response.ok) {
      console.error('User activity tracking failed:', response.status);
    }
  } catch (error) {
    console.error('User activity tracking failed:', error);
  }
}

export default function ActivityTracker() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const lastPageView = useRef('');
  const userId = (session?.user as { id?: string } | undefined)?.id;

  useEffect(() => {
    if (status !== 'authenticated' || !userId || !pathname) {
      lastPageView.current = '';
      return;
    }

    const pageKey = `${userId}:${pathname}`;
    if (lastPageView.current === pageKey) return;
    lastPageView.current = pageKey;
    void sendActivity({ eventType: 'PAGE_VIEW', path: pathname });
  }, [pathname, status, userId]);

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest('a, button, [role="button"], input[type="button"], input[type="submit"]');
      if (!target || target.hasAttribute('disabled') || target.closest('[data-activity-ignore]')) return;

      const targetType = target.matches('a') ? 'LINK' : target.matches('button, input') ? 'BUTTON' : 'OTHER';
      const targetLabel = target.getAttribute('data-activity-label') || undefined;
      void sendActivity({
        eventType: 'INTERACTION',
        path: window.location.pathname,
        targetType,
        ...(targetLabel ? { targetLabel } : {}),
      });
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [status, userId]);

  return null;
}
