'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import ActivityTracker from '../components/ActivityTracker';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ActivityTracker />
      {children}
    </SessionProvider>
  );
}
