'use client';

import React, { useState } from 'react';
import { createAgent } from '@/lib/api';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated: () => void;
}

export default function AddAgentModal({
  isOpen,
  onClose,
  onAgentCreated,
}: AddAgentModalProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    token: string;
    dockerCommand: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await createAgent(name.trim());
      setResult({
        token: data.token,
        dockerCommand: data.dockerCommand,
      });
      onAgentCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.dockerCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = result.dockerCommand;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName('');
    setResult(null);
    setError('');
    setCopied(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {result ? '✅ Agent Created' : '🚀 Add New Agent'}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {!result ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. production-ec2, staging-server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-offline)',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="modal-footer" style={{ padding: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading || !name.trim()}
                >
                  {isLoading ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  marginBottom: '16px',
                  lineHeight: 1.6,
                }}
              >
                Run this command on the target server to start monitoring.
                The token is shown <strong>only once</strong> — copy it now.
              </p>

              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-stale)',
                  fontSize: '12px',
                  marginBottom: '16px',
                  fontWeight: 600,
                }}
              >
                ⚠️ This token will not be shown again. Copy the command below.
              </div>

              <div className="code-block">
                <button
                  className={`code-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                <pre>{result.dockerCommand}</pre>
              </div>

              <div className="modal-footer" style={{ padding: '16px 0 0' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleClose}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
