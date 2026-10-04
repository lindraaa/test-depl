import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { globalValidationPipe } from '../src/common/pipes/validation.pipe';

let appInstance: any;

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

  appInstance = app.getHttpAdapter().getInstance();
  return appInstance;
}

module.exports = async function handler(req: any, res: any) {
  try {
    const instance = appInstance ?? (await bootstrap());
    return instance(req, res);
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