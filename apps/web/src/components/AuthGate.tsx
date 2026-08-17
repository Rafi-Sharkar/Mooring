'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentAdmin, type Admin } from '@/lib/auth';

/**
 * Client-side auth guard for protected route groups.
 * - On mount, verifies the session via GET /api/auth/me.
 * - If not authenticated, redirects to /login?next=<current path>.
 * - While verifying, renders a spinner (no children yet) to avoid
 *   briefly flashing protected UI to unauthenticated users.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<Admin | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await getCurrentAdmin();
      if (cancelled) return;
      if (!me) {
        const here = pathname + (typeof window !== 'undefined' ? window.location.search : '');
        router.replace(`/login?next=${encodeURIComponent(here)}`);
        return;
      }
      setAdmin(me);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (admin === undefined) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!admin) {
    // Redirect is in flight; render nothing.
    return null;
  }

  return <>{children}</>;
}