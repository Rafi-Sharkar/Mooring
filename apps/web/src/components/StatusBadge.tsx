'use client';

import React from 'react';

interface StatusBadgeProps {
  status: 'ONLINE' | 'OFFLINE' | 'STALE';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusClass = status.toLowerCase();

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className={`status-dot ${statusClass}`}></span>
      {status}
    </span>
  );
}
