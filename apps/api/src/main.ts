import 'dotenv/config';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Load env from apps/api/.env if present (overrides nothing — only sets missing vars)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: envPath });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Parse cookies (needed for HttpOnly JWT session cookie)
  app.use(cookieParser());

  // Enable CORS for dashboard — credentials required for cookie auth
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Use raw WS adapter (lighter than Socket.IO for server-to-server)
  app.useWebSocketAdapter(new WsAdapter(app));

  // Global prefix for REST endpoints
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Dockhand API running on http://localhost:${port}`);
  console.log(`🔌 WebSocket gateway at ws://localhost:${port}/api/hawser/connect`);
}

bootstrap();
