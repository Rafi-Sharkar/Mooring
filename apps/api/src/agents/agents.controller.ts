import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  /**
   * POST /api/agents
   * Create a new agent and return the one-time plaintext token.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAgentDto) {
    const result = await this.agentsService.create(dto);

    // Build the docker run command for easy copy-paste
    const serverUrl =
      process.env.DOCKHAND_PUBLIC_URL || 'wss://docker.rafisharkar.com/api/hawser/connect';

    const dockerCommand = [
      'docker run -d \\',
      '  --name hawser \\',
      '  --restart unless-stopped \\',
      '  -v /var/run/docker.sock:/var/run/docker.sock \\',
      `  -e DOCKHAND_SERVER_URL="${serverUrl}" \\`,
      `  -e TOKEN="${result.token}" \\`,
      '  -e AGENT_NAME="$(hostname)" \\',
      '  ghcr.io/rafisharkar/hawser:latest',
    ].join('\n');

    return {
      ...result,
      dockerCommand,
    };
  }

  /**
   * GET /api/agents
   * List all agents with status and container counts.
   */
  @Get()
  async findAll() {
    return this.agentsService.findAll();
  }

  /**
   * GET /api/agents/:id
   * Get a single agent with its containers.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  /**
   * DELETE /api/agents/:id
   * Delete an agent and all its data.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }
}
