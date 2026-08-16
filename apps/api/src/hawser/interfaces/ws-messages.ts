/**
 * WebSocket message type definitions for Dockhand ↔ Hawser communication.
 */

// === Messages FROM agent TO server ===

export interface AuthMessage {
  type: 'auth';
  token: string;
  agentName: string;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: number;
}

export interface ContainerInfo {
  containerId: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

export interface ContainerSyncMessage {
  type: 'containers:sync';
  containers: ContainerInfo[];
}

export interface ContainerStats {
  containerId: string;
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
  netRx: number;
  netTx: number;
}

export interface ContainerStatsMessage {
  type: 'containers:stats';
  stats: ContainerStats[];
}

export interface SystemInfoMessage {
  type: 'system:info';
  hostname: string;
  platform: string;
  arch: string;
  dockerVersion: string;
  totalMemory: number;
  cpuCount: number;
}

export type AgentMessage =
  | AuthMessage
  | HeartbeatMessage
  | ContainerSyncMessage
  | ContainerStatsMessage
  | SystemInfoMessage;

// === Messages FROM server TO agent ===

export interface AuthResponseMessage {
  type: 'auth:response';
  success: boolean;
  agentId?: string;
  error?: string;
}

export interface ContainerActionMessage {
  type: 'container:action';
  action: 'restart' | 'stop' | 'start';
  containerId: string;
}

export type ServerMessage = AuthResponseMessage | ContainerActionMessage;
