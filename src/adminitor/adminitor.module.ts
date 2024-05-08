import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { ConfigService } from '@nestjs/config'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { Encryption } from 'lib/encryption.service'
import { AdminitorService } from './adminitor.service'
import { AdminitorController } from './adminitor.controller'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [
    JwtModule, CloudinaryModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AdminitorController],
  providers: [
    AdminitorService, PrismaService, Encryption, CloudinaryService,
    SendRes, MiscService, ConfigService, PlunkService, PaystackService
  ],
})
export class AdminitorModule { }
