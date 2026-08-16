'use client';

import React from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';
import type { Agent } from '@/lib/api';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`} style={{ textDecoration: 'none' }}>
      <div className="agent-card">
        <div className="agent-card-header">
          <div>
            <div className="agent-name">{agent.name}</div>
            <div className="agent-id">{agent.id.substring(0, 8)}...</div>
          </div>
          <StatusBadge status={agent.status} />
        </div>

        <div className="agent-card-body">
          <div className="agent-info-row">
            <span className="agent-info-label">Last Seen</span>
            <span className="agent-info-value">{timeAgo(agent.lastSeenAt)}</span>
          </div>

          <div className="agent-info-row">
            <span className="agent-info-label">IP Address</span>
            <span className="agent-info-value">
              {agent.ipAddress || 'Unknown'}
            </span>
          </div>

          <div className="agent-info-row">
            <span className="agent-info-label">Containers</span>
            <span className="agent-containers-count">
              📦 {agent.containerCount}
            </span>
          </div>

          {agent.osInfo && (
            <div className="agent-info-row">
              <span className="agent-info-label">Platform</span>
              <span className="agent-info-value">
                {(agent.osInfo as any).platform || ''} {(agent.osInfo as any).arch || ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
