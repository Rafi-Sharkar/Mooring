import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for dashboard
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
