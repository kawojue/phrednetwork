import * as express from 'express'
import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const PORT: number = parseInt(process.env.PORT, 10) || 2002
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      `http://localhost:${PORT}`,
      'https://phrednetwork.com',
      'http://192.168.0.106:5173',
      'http://192.168.0.106:5174',
      'https://phred-web.onrender.com',
      'https://phred-admin.onrender.com',
      'https://phred-server.onrender.com',
    ],
    methods: 'GET,PATCH,POST,PUT,DELETE',
    credentials: true
  })
  app.use(express.json({ limit: 15 << 20 }))
  app.useGlobalPipes(new ValidationPipe())
  app.setGlobalPrefix('/api')

  const swaggerOptions = new DocumentBuilder()
    .setTitle('Phrednetwork API')
    .setDescription('API Endpoints')
    .setVersion('1.0.1')
    .addServer(`https://phred-server.onrender.com`, 'Staging')
    .addServer(`http://localhost:${PORT}/`, 'Local environment')
    .addBearerAuth()
    .addTag('Routes')
    .build()

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions)
  SwaggerModule.setup('docs', app, swaggerDocument)

  try {
    await app.listen(PORT)
    console.log(`http://localhost:${PORT}`)
  } catch (err) {
    console.error(err.message)
  }
}
bootstrap()
