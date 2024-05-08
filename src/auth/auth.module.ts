import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SendRes } from 'lib/sendRes.service'
import { ConfigService } from '@nestjs/config'
import { MiscService } from 'lib/misc.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { JwtStrategy } from 'src/jwt/jwt.strategy'
import { PrismaService } from 'lib/prisma.service'
import { Encryption } from 'lib/encryption.service'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [
    JwtModule, CloudinaryModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [AuthController],
  providers: [
    AuthService, PrismaService, JwtStrategy, PlunkService, Encryption,
    ConfigService, SendRes, CloudinaryService, MiscService, PaystackService,
  ],
})
export class AuthModule { }
