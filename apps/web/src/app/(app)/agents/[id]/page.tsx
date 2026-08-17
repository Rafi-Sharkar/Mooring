'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ContainerTable from '@/components/ContainerTable';
import { getAgent, deleteAgent, type AgentDetail } from '@/lib/api';
import { useRouter } from 'next/navigation';

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '-';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

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

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAgent = useCallback(async () => {
    try {
      const data = await getAgent(agentId);
      setAgent(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agent');
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
    const interval = setInterval(fetchAgent, 10000);
    return () => clearInterval(interval);
  }, [fetchAgent]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete agent "${agent?.name}"? This cannot be undone.`)) return;
    try {
      await deleteAgent(agentId);
      router.push('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div>
        <Link href="/" className="back-link">
          ← Back to Fleet
        </Link>
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div className="empty-state-title">Agent Not Found</div>
          <div className="empty-state-text">{error || 'This agent does not exist.'}</div>
        </div>
      </div>
    );
  }

  const osInfo = (agent.osInfo || {}) as Record<string, any>;
  const runningContainers = agent.containers.filter((c) => c.state === 'running').length;

  return (
    <>
      <Link href="/" className="back-link">
        ← Back to Fleet
      </Link>

      <div className="agent-detail-header">
        <div className="agent-detail-title">
          <h1 className="agent-detail-name">{agent.name}</h1>
          <StatusBadge status={agent.status} />
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
          🗑️ Delete Agent
        </button>
      </div>

      {/* System info */}
      <div className="system-info-grid">
        <div className="system-info-card">
          <div className="system-info-label">Last Seen</div>
          <div className="system-info-value">{timeAgo(agent.lastSeenAt)}</div>
        </div>
        <div className="system-info-card">
          <div className="system-info-label">IP Address</div>
          <div className="system-info-value">{agent.ipAddress || 'Unknown'}</div>
        </div>
        <div className="system-info-card">
          <div className="system-info-label">Platform</div>
          <div className="system-info-value">
            {osInfo.platform || '-'} {osInfo.arch || ''}
          </div>
        </div>
        <div className="system-info-card">
          <div className="system-info-label">Docker Version</div>
          <div className="system-info-value">{osInfo.dockerVersion || '-'}</div>
        </div>
        <div className="system-info-card">
          <div className="system-info-label">Total Memory</div>
          <div className="system-info-value">
            {formatBytes(osInfo.totalMemory)}
          </div>
        </div>
        <div className="system-info-card">
          <div className="system-info-label">CPU Cores</div>
          <div className="system-info-value">{osInfo.cpuCount || '-'}</div>
        </div>
        <div className="system-info-card">
          <div className="system-info-label">Containers</div>
          <div className="system-info-value">
            {runningContainers} / {agent.containers.length} running
          </div>
        </div>
        <div className="system-info-card">
          <div className="system-info-label">Agent ID</div>
          <div className="system-info-value" style={{ fontSize: '11px' }}>
            {agent.id}
          </div>
        </div>
      </div>

      {/* Containers */}
      <h2 className="section-title">📦 Containers</h2>
      <ContainerTable containers={agent.containers} />
    </>
  );
}
