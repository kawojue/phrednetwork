import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { PassportModule } from '@nestjs/passport'
import { UserController } from './user.controller'
import { PrismaService } from 'lib/prisma.service'
import { PaystackService } from 'lib/Paystack/paystack.service'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [UserController],
  providers: [UserService, PrismaService, SendRes, MiscService, PaystackService]
})
export class UserModule { }
