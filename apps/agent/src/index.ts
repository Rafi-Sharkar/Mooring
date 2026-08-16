import { WsClient } from './ws-client';
import { listContainers, getContainerStats } from './docker-client';
import { getSystemInfo } from './system-info';

// Read configuration from environment
const DOCKHAND_SERVER_URL = process.env.DOCKHAND_SERVER_URL;
const TOKEN = process.env.TOKEN;
const AGENT_NAME = process.env.AGENT_NAME || require('os').hostname();

// Intervals (ms)
const CONTAINER_SYNC_INTERVAL = 10_000; // 10 seconds
const STATS_INTERVAL = 30_000; // 30 seconds
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

if (!DOCKHAND_SERVER_URL) {
  console.error('❌ DOCKHAND_SERVER_URL environment variable is required');
  process.exit(1);
}

if (!TOKEN) {
  console.error('❌ TOKEN environment variable is required');
  process.exit(1);
}

console.log(`
╔══════════════════════════════════════════╗
║         🔱 Hawser Agent v1.0.0          ║
╠══════════════════════════════════════════╣
║  Agent: ${AGENT_NAME.padEnd(32)}║
║  Server: ${DOCKHAND_SERVER_URL.substring(0, 31).padEnd(31)}║
╚══════════════════════════════════════════╝
`);

let syncInterval: NodeJS.Timeout | null = null;
let statsInterval: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let isAuthenticated = false;

const client = new WsClient({
  url: DOCKHAND_SERVER_URL,
  token: TOKEN,
  agentName: AGENT_NAME,

  onOpen: () => {
    console.log('[Agent] Connected to Dockhand server, authenticating...');
  },

  onMessage: async (message: any) => {
    switch (message.type) {
      case 'auth:response':
        if (message.success) {
          console.log(`[Agent] ✅ Authenticated as agent ${message.agentId}`);
          isAuthenticated = true;
          await startMonitoring();
        } else {
          console.error(`[Agent] ❌ Authentication failed: ${message.error}`);
          isAuthenticated = false;
        }
        break;

      case 'container:action':
        console.log(`[Agent] Received action: ${message.action} for container ${message.containerId}`);
        // Future: handle container restart/stop/start
        break;

      case 'error':
        console.error(`[Agent] Server error: ${message.message}`);
        break;

      default:
        console.log(`[Agent] Unknown message type: ${message.type}`);
    }
  },

  onClose: () => {
    console.log('[Agent] Disconnected from server');
    isAuthenticated = false;
    stopMonitoring();
  },
});

/**
 * Start all monitoring loops after successful authentication.
 */
async function startMonitoring() {
  // Send system info immediately
  try {
    const systemInfo = await getSystemInfo();
    client.send({ type: 'system:info', ...systemInfo });
    console.log(`[Agent] Sent system info: ${systemInfo.platform} ${systemInfo.arch}, Docker ${systemInfo.dockerVersion}`);
  } catch (err) {
    console.error('[Agent] Failed to get system info:', err);
  }

  // Initial container sync
  await syncContainers();

  // Start periodic loops
  syncInterval = setInterval(syncContainers, CONTAINER_SYNC_INTERVAL);
  statsInterval = setInterval(pushStats, STATS_INTERVAL);
  heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  console.log('[Agent] 📊 Monitoring started');
  console.log(`  • Container sync: every ${CONTAINER_SYNC_INTERVAL / 1000}s`);
  console.log(`  • Stats push: every ${STATS_INTERVAL / 1000}s`);
  console.log(`  • Heartbeat: every ${HEARTBEAT_INTERVAL / 1000}s`);
}

/**
 * Stop all monitoring loops.
 */
function stopMonitoring() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
}

/**
 * Sync current container list to the server.
 */
async function syncContainers() {
  if (!isAuthenticated) return;

  try {
    const containers = await listContainers();
    client.send({ type: 'containers:sync', containers });
  } catch (err) {
    console.error('[Agent] Failed to sync containers:', err);
  }
}

/**
 * Push container resource stats to the server.
 */
async function pushStats() {
  if (!isAuthenticated) return;

  try {
    const stats = await getContainerStats();
    if (stats.length > 0) {
      client.send({ type: 'containers:stats', stats });
    }
  } catch (err) {
    console.error('[Agent] Failed to push stats:', err);
  }
}

/**
 * Send a heartbeat to the server.
 */
function sendHeartbeat() {
  if (!isAuthenticated) return;
  client.send({ type: 'heartbeat', timestamp: Date.now() });
}

// Start the agent
client.connect();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Agent] Received SIGTERM, shutting down...');
  stopMonitoring();
  client.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Agent] Received SIGINT, shutting down...');
  stopMonitoring();
  client.close();
  process.exit(0);
});
