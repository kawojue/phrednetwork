import { Module } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'
import { JwtModule as NestJwtModule } from '@nestjs/jwt'

@Module({
    imports: [
        NestJwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '90d' },
        }),
    ],
    providers: [JwtStrategy],
    exports: [NestJwtModule],
})
export class JwtModule { }