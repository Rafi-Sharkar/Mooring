const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || '')
    : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'STALE';
  lastSeenAt: string | null;
  ipAddress: string | null;
  osInfo: Record<string, any> | null;
  containerCount: number;
  createdAt: string;
}

export interface Container {
  id: string;
  agentId: string;
  containerId: string;
  name: string;
  image: string;
  status: string;
  state: string;
  cpuPercent: number | null;
  memUsage: number | null;
  memLimit: number | null;
  netRx: number | null;
  netTx: number | null;
  updatedAt: string;
}

export interface AgentDetail extends Agent {
  containers: Container[];
  updatedAt: string;
}

export interface CreateAgentResponse {
  agent: { id: string; name: string; status: string; createdAt: string };
  token: string;
  dockerCommand: string;
}

// API functions
export async function getAgents(): Promise<Agent[]> {
  return fetchApi('/api/agents');
}

export async function getAgent(id: string): Promise<AgentDetail> {
  return fetchApi(`/api/agents/${id}`);
}

export async function createAgent(name: string): Promise<CreateAgentResponse> {
  return fetchApi('/api/agents', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  return fetchApi(`/api/agents/${id}`, { method: 'DELETE' });
}
