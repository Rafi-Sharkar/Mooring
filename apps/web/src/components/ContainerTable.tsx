'use client';

import React from 'react';
import type { Container } from '@/lib/api';

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatCpu(cpu: number | null): string {
  if (cpu === null || cpu === undefined) return '-';
  return `${cpu.toFixed(1)}%`;
}

interface ContainerTableProps {
  containers: Container[];
}

export default function ContainerTable({ containers }: ContainerTableProps) {
  if (containers.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px' }}>
        <div className="empty-state-icon">📦</div>
        <div className="empty-state-title">No Containers</div>
        <div className="empty-state-text">
          This agent hasn&apos;t reported any containers yet.
        </div>
      </div>
    );
  }

  return (
    <div className="container-table-wrapper">
      <table className="container-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Image</th>
            <th>State</th>
            <th>Status</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Net I/O</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((container) => (
            <tr key={container.id}>
              <td>
                <span className="container-name">{container.name}</span>
              </td>
              <td>
                <span className="container-image">{container.image}</span>
              </td>
              <td>
                <span className={`container-state ${container.state}`}>
                  {container.state}
                </span>
              </td>
              <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {container.status}
              </td>
              <td>
                <span className="stat-mini cpu">
                  {formatCpu(container.cpuPercent)}
                </span>
              </td>
              <td>
                <span className="stat-mini mem">
                  {formatBytes(container.memUsage)}
                  {container.memLimit ? ` / ${formatBytes(container.memLimit)}` : ''}
                </span>
              </td>
              <td>
                <span className="stat-mini" style={{ color: 'var(--text-secondary)' }}>
                  ↓{formatBytes(container.netRx)} ↑{formatBytes(container.netTx)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
