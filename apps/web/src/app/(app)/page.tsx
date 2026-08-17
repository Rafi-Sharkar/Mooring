'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AgentCard from '@/components/AgentCard';
import AddAgentModal from '@/components/AddAgentModal';
import { getAgents, type Agent } from '@/lib/api';

export default function FleetOverview() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  const fetchAgents = useCallback(async () => {
    try {
      const data = await getAgents();
      setAgents(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const onlineCount = agents.filter((a) => a.status === 'ONLINE').length;
  const staleCount = agents.filter((a) => a.status === 'STALE').length;
  const offlineCount = agents.filter((a) => a.status === 'OFFLINE').length;
  const totalContainers = agents.reduce((sum, a) => sum + a.containerCount, 0);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Fleet Overview</h1>
          <p className="page-subtitle">
            Monitor all your Docker hosts in real-time
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          ➕ Add Agent
        </button>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-label">Total Agents</div>
          <div className="stat-value total">{agents.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Online</div>
          <div className="stat-value online">{onlineCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stale</div>
          <div className="stat-value stale">{staleCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Offline</div>
          <div className="stat-value offline">{offlineCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Containers</div>
          <div className="stat-value total">{totalContainers}</div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-offline)',
            fontSize: '14px',
            marginBottom: '24px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : agents.length === 0 ? (
        /* Empty state */
        <div className="empty-state">
          <div className="empty-state-icon">🚢</div>
          <div className="empty-state-title">No Agents Yet</div>
          <div className="empty-state-text">
            Add your first agent to start monitoring Docker containers across
            your fleet.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            ➕ Add Your First Agent
          </button>
        </div>
      ) : (
        /* Agent grid */
        <div className="agents-grid">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      <AddAgentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAgentCreated={fetchAgents}
      />
    </>
  );
}
