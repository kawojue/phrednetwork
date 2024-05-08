import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { WalletService } from './wallet.service'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { WalletController } from './wallet.controller'
import { PaystackService } from 'lib/Paystack/paystack.service'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [WalletController],
  providers: [WalletService, MiscService, PrismaService, PaystackService, SendRes, PlunkService],
})
export class WalletModule { }
