import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

// A transient failure (e.g. the database briefly unreachable) must fail the one
// request or cron tick that hit it, never take the whole process down — Node's
// default behavior for an unhandled rejection is to crash the process, which is
// exactly what happened once during development when Postgres had a momentary
// blip. Logging here instead of letting it propagate is the difference between
// "one request 500s" and "the whole API needs a manual restart."
process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled promise rejection — request/job failed, process kept alive', reason as Error, 'Bootstrap');
});
process.on('uncaughtException', (err) => {
  Logger.error('Uncaught exception — kept process alive', err.stack, 'Bootstrap');
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173'),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}/api`);
}

bootstrap();
