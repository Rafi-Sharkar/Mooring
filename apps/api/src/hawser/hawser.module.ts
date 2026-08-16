import { Module } from '@nestjs/common';
import { HawserGateway } from './hawser.gateway';
import { HawserService } from './hawser.service';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [AgentsModule],
  providers: [HawserGateway, HawserService],
  exports: [HawserService],
})
export class HawserModule {}
