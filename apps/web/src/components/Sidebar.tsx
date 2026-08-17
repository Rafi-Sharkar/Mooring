'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentAdmin, logout, type Admin } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentAdmin().then((a) => {
      if (!cancelled) setAdmin(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const links = [
    { href: '/', label: 'Fleet Overview', icon: '🖥️' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🔱</div>
          <span className="sidebar-logo-text">Dockhand</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        {admin && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden>
              {admin.username.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={admin.username}>
                {admin.username}
              </div>
              <button className="sidebar-logout" onClick={onLogout}>
                Sign out
              </button>
            </div>
          </div>
        )}
        <div className="sidebar-version">Dockhand v1.0.0</div>
      </div>
    </aside>
  );
}