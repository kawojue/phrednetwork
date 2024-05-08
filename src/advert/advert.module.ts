import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from 'src/jwt/jwt.module'
import { AdvertService } from './advert.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { AdvertController } from './advert.controller'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [
    JwtModule, CloudinaryModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [AdvertController],
  providers: [
    AdvertService,
    SendRes,
    MiscService,
    PrismaService,
    ConfigService,
    ConfigService,
    PaystackService,
    CloudinaryService,
  ],
})
export class AdvertModule { }
