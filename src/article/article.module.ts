import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { ConfigService } from '@nestjs/config'
import { MiscService } from 'lib/misc.service'
import { PassportModule } from '@nestjs/passport'
import { ArticleService } from './article.service'
import { PrismaService } from 'lib/prisma.service'
import { ArticleController } from './article.controller'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule,
  ],
  controllers: [ArticleController],
  providers: [
    ArticleService, PrismaService, MiscService,
    CloudinaryService, ConfigService, SendRes,
  ],
})
export class ArticleModule { }
