import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads', 'presentations');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.use('/api/uploads', express.static(join(process.cwd(), 'uploads')));

  // Payload body limit for large presentation files
  const maxUploadSize = process.env.MAX_UPLOAD_SIZE || '50mb';
  app.use(express.json({ limit: maxUploadSize }));
  app.use(express.urlencoded({ limit: maxUploadSize, extended: true }));

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🎓 Backend E-Learning API corriendo en: http://localhost:${port}`);
}

bootstrap();
