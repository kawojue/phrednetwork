import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { ForumService } from './forum.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { ConfigService } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { ForumController } from './forum.controller'
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [JwtModule, PassportModule.register({ defaultStrategy: 'jwt' }), CloudinaryModule],
  controllers: [ForumController],
  providers: [ForumService, PrismaService, SendRes, MiscService, ConfigService, CloudinaryService],
})
export class ForumModule { }