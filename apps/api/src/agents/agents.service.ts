import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AgentStatus } from '@prisma/client';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Create a new agent with a generated token.
   * Returns the agent record AND the plaintext token (shown once).
   */
  async create(dto: CreateAgentDto) {
    const token = this.authService.generateToken();
    const tokenHash = await this.authService.hashToken(token);

    const agent = await this.prisma.agent.create({
      data: {
        name: dto.name,
        tokenHash,
      },
    });

    this.logger.log(`Created agent "${agent.name}" (${agent.id})`);

    // Log the creation
    await this.prisma.auditLog.create({
      data: {
        agentId: agent.id,
        action: 'agent.created',
        details: { name: agent.name },
      },
    });

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        createdAt: agent.createdAt,
      },
      token, // plaintext — shown ONCE, never stored
    };
  }

  /**
   * List all agents with their container counts.
   */
  async findAll() {
    const agents = await this.prisma.agent.findMany({
      include: {
        _count: { select: { containers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      lastSeenAt: agent.lastSeenAt,
      ipAddress: agent.ipAddress,
      osInfo: agent.osInfo,
      containerCount: agent._count.containers,
      createdAt: agent.createdAt,
    }));
  }

  /**
   * Get a single agent with full container details.
   */
  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        containers: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent ${id} not found`);
    }

    return agent;
  }

  /**
   * Delete an agent and all its data.
   */
  async remove(id: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent ${id} not found`);
    }

    await this.prisma.agent.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        action: 'agent.deleted',
        details: { name: agent.name, agentId: id },
      },
    });

    this.logger.log(`Deleted agent "${agent.name}" (${id})`);
    return { message: `Agent "${agent.name}" deleted` };
  }

  /**
   * Find an agent by verifying a plaintext token against all stored hashes.
   * Used during WebSocket handshake.
   */
  async findByToken(token: string) {
    // Get all agents — in production with many agents, consider a token prefix lookup
    const agents = await this.prisma.agent.findMany({
      select: { id: true, name: true, tokenHash: true, status: true },
    });

    for (const agent of agents) {
      const valid = await this.authService.verifyToken(token, agent.tokenHash);
      if (valid) {
        return agent;
      }
    }

    return null;
  }

  /**
   * Update agent status and last seen timestamp.
   */
  async updateStatus(id: string, status: AgentStatus, ipAddress?: string) {
    return this.prisma.agent.update({
      where: { id },
      data: {
        status,
        lastSeenAt: new Date(),
        ...(ipAddress && { ipAddress }),
      },
    });
  }

  /**
   * Update agent system info (OS, Docker version, etc.).
   */
  async updateSystemInfo(id: string, osInfo: Record<string, unknown>) {
    return this.prisma.agent.update({
      where: { id },
      data: { osInfo: osInfo as any },
    });
  }

  /**
   * Sync container list from an agent — upsert all, remove stale ones.
   */
  async syncContainers(
    agentId: string,
    containers: Array<{
      containerId: string;
      name: string;
      image: string;
      status: string;
      state: string;
    }>,
  ) {
    const existingIds = new Set<string>();

    // Upsert each container
    for (const c of containers) {
      await this.prisma.container.upsert({
        where: {
          agentId_containerId: {
            agentId,
            containerId: c.containerId,
          },
        },
        create: {
          agentId,
          containerId: c.containerId,
          name: c.name,
          image: c.image,
          status: c.status,
          state: c.state,
        },
        update: {
          name: c.name,
          image: c.image,
          status: c.status,
          state: c.state,
        },
      });
      existingIds.add(c.containerId);
    }

    // Remove containers that no longer exist on the agent
    await this.prisma.container.deleteMany({
      where: {
        agentId,
        containerId: { notIn: Array.from(existingIds) },
      },
    });
  }

  /**
   * Update container stats (CPU, memory, network).
   */
  async updateContainerStats(
    agentId: string,
    stats: Array<{
      containerId: string;
      cpuPercent: number;
      memUsage: number;
      memLimit: number;
      netRx: number;
      netTx: number;
    }>,
  ) {
    for (const s of stats) {
      await this.prisma.container.updateMany({
        where: { agentId, containerId: s.containerId },
        data: {
          cpuPercent: s.cpuPercent,
          memUsage: s.memUsage,
          memLimit: s.memLimit,
          netRx: s.netRx,
          netTx: s.netTx,
        },
      });
    }
  }

  /**
   * Mark stale agents (online but not seen recently).
   */
  async markStaleAgents(thresholdSeconds: number = 90) {
    const threshold = new Date(Date.now() - thresholdSeconds * 1000);

    const result = await this.prisma.agent.updateMany({
      where: {
        status: AgentStatus.ONLINE,
        lastSeenAt: { lt: threshold },
      },
      data: { status: AgentStatus.STALE },
    });

    if (result.count > 0) {
      this.logger.warn(`Marked ${result.count} agent(s) as STALE`);
    }

    return result;
  }
}
