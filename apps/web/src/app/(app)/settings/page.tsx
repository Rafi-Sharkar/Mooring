'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AddAgentModal from '@/components/AddAgentModal';
import StatusBadge from '@/components/StatusBadge';
import { getAgents, deleteAgent, type Agent } from '@/lib/api';

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

export default function SettingsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const data = await getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleDelete = async (agent: Agent) => {
    if (
      !confirm(
        `Delete agent "${agent.name}"? This will remove all its data and disconnect it permanently.`,
      )
    )
      return;

    try {
      await deleteAgent(agent.id);
      fetchAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent');
    }
  };

  return (
    <>
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage agents and configuration</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          ➕ Add Agent
        </button>
      </div>

      {/* Agent management table */}
      <h2 className="section-title" style={{ marginBottom: '16px' }}>
        🔱 Registered Agents
      </h2>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : agents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔑</div>
          <div className="empty-state-title">No Agents Registered</div>
          <div className="empty-state-text">
            Create your first agent to get a docker run command.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            ➕ Add Agent
          </button>
        </div>
      ) : (
        <div className="container-table-wrapper">
          <table className="container-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Last Seen</th>
                <th>IP</th>
                <th>Containers</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td>
                    <span className="container-name">{agent.name}</span>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        marginTop: '2px',
                      }}
                    >
                      {agent.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={agent.status} />
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {timeAgo(agent.lastSeenAt)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {agent.ipAddress || '-'}
                  </td>
                  <td>
                    <span className="agent-containers-count">
                      📦 {agent.containerCount}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(agent)}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
