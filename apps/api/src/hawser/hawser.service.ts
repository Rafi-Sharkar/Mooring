import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentsService } from '../agents/agents.service';
import { AgentStatus } from '@prisma/client';
import {
  AgentMessage,
  AuthResponseMessage,
} from './interfaces/ws-messages';

interface ConnectedAgent {
  agentId: string;
  agentName: string;
  socket: any; // WebSocket instance
}

@Injectable()
export class HawserService {
  private readonly logger = new Logger(HawserService.name);

  // Map of WebSocket client → agent info (for authenticated clients)
  private readonly authenticatedClients = new Map<any, ConnectedAgent>();

  // Map of agentId → WebSocket client (for sending commands)
  private readonly agentSockets = new Map<string, any>();

  constructor(private readonly agentsService: AgentsService) {}

  /**
   * Check if a WebSocket client has been authenticated.
   */
  isAuthenticated(client: any): boolean {
    return this.authenticatedClients.has(client);
  }

  /**
   * Get all connected agent IDs (for live dashboard updates).
   */
  getConnectedAgentIds(): string[] {
    return Array.from(this.agentSockets.keys());
  }

  /**
   * Handle an incoming message from a WebSocket client.
   */
  async handleMessage(client: any, message: AgentMessage) {
    // If not authenticated, only accept auth messages
    if (!this.isAuthenticated(client)) {
      if (message.type === 'auth') {
        await this.handleAuth(client, message);
      } else {
        client.send(
          JSON.stringify({ type: 'error', message: 'Not authenticated' }),
        );
        client.close(4003, 'Not authenticated');
      }
      return;
    }

    const agentInfo = this.authenticatedClients.get(client)!;

    switch (message.type) {
      case 'heartbeat':
        await this.handleHeartbeat(agentInfo);
        break;
      case 'containers:sync':
        await this.handleContainerSync(agentInfo, message);
        break;
      case 'containers:stats':
        await this.handleContainerStats(agentInfo, message);
        break;
      case 'system:info':
        await this.handleSystemInfo(agentInfo, message);
        break;
      default:
        this.logger.warn(
          `Unknown message type from agent ${agentInfo.agentName}: ${(message as any).type}`,
        );
    }
  }

  /**
   * Handle agent authentication.
   */
  private async handleAuth(client: any, message: any) {
    const { token, agentName } = message;

    if (!token || !agentName) {
      const response: AuthResponseMessage = {
        type: 'auth:response',
        success: false,
        error: 'Missing token or agentName',
      };
      client.send(JSON.stringify(response));
      client.close(4002, 'Missing credentials');
      return;
    }

    // Verify token against stored hashes
    const agent = await this.agentsService.findByToken(token);

    if (!agent) {
      this.logger.warn(`Authentication failed for agent "${agentName}"`);
      const response: AuthResponseMessage = {
        type: 'auth:response',
        success: false,
        error: 'Invalid token',
      };
      client.send(JSON.stringify(response));
      client.close(4003, 'Invalid token');
      return;
    }

    // Check if this agent is already connected — disconnect old socket
    const existingSocket = this.agentSockets.get(agent.id);
    if (existingSocket) {
      this.logger.warn(
        `Agent "${agent.name}" reconnecting — closing old connection`,
      );
      this.authenticatedClients.delete(existingSocket);
      existingSocket.close(4004, 'Replaced by new connection');
    }

    // Register the authenticated client
    const connectedAgent: ConnectedAgent = {
      agentId: agent.id,
      agentName: agentName,
      socket: client,
    };
    this.authenticatedClients.set(client, connectedAgent);
    this.agentSockets.set(agent.id, client);

    // Clear auth timeout
    if ((client as any).__authTimeout) {
      clearTimeout((client as any).__authTimeout);
      delete (client as any).__authTimeout;
    }

    // Update agent status to online
    const ip = client._socket?.remoteAddress;
    await this.agentsService.updateStatus(agent.id, AgentStatus.ONLINE, ip);

    // Update agent name if it changed
    if (agentName !== agent.name) {
      // Agent name can be updated from the agent side
    }

    this.logger.log(
      `✅ Agent "${agentName}" (${agent.id}) authenticated successfully`,
    );

    // Send auth success response
    const response: AuthResponseMessage = {
      type: 'auth:response',
      success: true,
      agentId: agent.id,
    };
    client.send(JSON.stringify(response));
  }

  /**
   * Handle agent heartbeat — update lastSeenAt.
   */
  private async handleHeartbeat(agentInfo: ConnectedAgent) {
    await this.agentsService.updateStatus(
      agentInfo.agentId,
      AgentStatus.ONLINE,
    );
  }

  /**
   * Handle container list sync from agent.
   */
  private async handleContainerSync(agentInfo: ConnectedAgent, message: any) {
    const { containers } = message;
    if (!Array.isArray(containers)) return;

    await this.agentsService.syncContainers(agentInfo.agentId, containers);
    this.logger.debug(
      `Synced ${containers.length} containers from agent "${agentInfo.agentName}"`,
    );
  }

  /**
   * Handle container stats update from agent.
   */
  private async handleContainerStats(agentInfo: ConnectedAgent, message: any) {
    const { stats } = message;
    if (!Array.isArray(stats)) return;

    await this.agentsService.updateContainerStats(agentInfo.agentId, stats);
  }

  /**
   * Handle system info from agent.
   */
  private async handleSystemInfo(agentInfo: ConnectedAgent, message: any) {
    const { hostname, platform, arch, dockerVersion, totalMemory, cpuCount } =
      message;
    await this.agentsService.updateSystemInfo(agentInfo.agentId, {
      hostname,
      platform,
      arch,
      dockerVersion,
      totalMemory,
      cpuCount,
    });
    this.logger.log(
      `Received system info from agent "${agentInfo.agentName}": ${platform} ${arch}, Docker ${dockerVersion}`,
    );
  }

  /**
   * Handle WebSocket disconnection.
   */
  async handleDisconnect(client: any) {
    const agentInfo = this.authenticatedClients.get(client);
    if (!agentInfo) return; // Was never authenticated

    this.authenticatedClients.delete(client);
    this.agentSockets.delete(agentInfo.agentId);

    // Mark agent as offline
    await this.agentsService.updateStatus(
      agentInfo.agentId,
      AgentStatus.OFFLINE,
    );

    this.logger.log(
      `Agent "${agentInfo.agentName}" (${agentInfo.agentId}) disconnected`,
    );
  }

  /**
   * Cron job: check for stale agents every 60 seconds.
   * Agents that are ONLINE but haven't sent a heartbeat in 90s are marked STALE.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkStaleAgents() {
    await this.agentsService.markStaleAgents(90);
  }

  /**
   * Send a command to a connected agent.
   */
  sendToAgent(agentId: string, message: object): boolean {
    const socket = this.agentSockets.get(agentId);
    if (!socket) return false;

    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (err) {
      this.logger.error(`Failed to send message to agent ${agentId}: ${err}`);
      return false;
    }
  }
}
