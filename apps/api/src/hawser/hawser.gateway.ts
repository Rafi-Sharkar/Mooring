import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'ws';
import { HawserService } from './hawser.service';

@WebSocketGateway({ path: '/api/hawser/connect' })
export class HawserGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(HawserGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly hawserService: HawserService) {}

  afterInit() {
    this.logger.log('Hawser WebSocket gateway initialized');
  }

  handleConnection(client: any) {
    this.logger.log(`New WebSocket connection from ${client._socket?.remoteAddress || 'unknown'}`);

    // Set up message handler
    client.on('message', async (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());
        await this.hawserService.handleMessage(client, message);
      } catch (err) {
        this.logger.error(`Failed to parse message: ${err}`);
        client.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    // Set a timeout for auth — if agent doesn't auth within 10s, disconnect
    const authTimeout = setTimeout(() => {
      if (!this.hawserService.isAuthenticated(client)) {
        this.logger.warn('Client did not authenticate within 10s, disconnecting');
        client.close(4001, 'Authentication timeout');
      }
    }, 10000);

    // Store timeout reference so we can clear it on auth success
    (client as any).__authTimeout = authTimeout;
  }

  handleDisconnect(client: any) {
    // Clear auth timeout if still pending
    if ((client as any).__authTimeout) {
      clearTimeout((client as any).__authTimeout);
    }

    this.hawserService.handleDisconnect(client);
  }
}
