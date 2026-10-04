import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { globalValidationPipe } from '../src/common/pipes/validation.pipe';

let handler: ((req: any, res: any) => void) | undefined;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.FRONTEND_URL ?? '*' });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Vet Backend API')
    .setDescription('REST API for the Vet backend service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();

  handler = app.getHttpAdapter().getInstance();
  return handler;
}

module.exports = async function vercelHandler(req: any, res: any) {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/favicon.ico') {
    res.setHeader('Content-Type', 'image/x-icon');
    return res.status(204).end();
  }

  try {
    const appHandler = handler ?? (await bootstrap());
    return appHandler(req, res);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server startup error';

    console.error('Vercel bootstrap failed:', error);

    return res.status(500).json({
      status: 500,
      message: 'Server startup failed',
      error: message,
    });
  }
};