import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // Spring admite booleanos JSON de nivel superior en los cambios de estado.
  app.use(json({ strict: false, limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
