import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { PassportModule } from '@nestjs/passport'
import { CommentService } from './comment.service'
import { PrismaService } from 'lib/prisma.service'
import { CommentController } from './comment.controller'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [CommentController],
  providers: [CommentService, SendRes, PrismaService, MiscService],
})
export class CommentModule { }
