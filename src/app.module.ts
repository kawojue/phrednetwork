import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { JobModule } from './job/job.module'
import { ConfigModule } from '@nestjs/config'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { AppController } from './app.controller'
import { PrismaService } from 'lib/prisma.service'
import { ForumModule } from './forum/forum.module'
import { AdvertModule } from './advert/advert.module'
import { WalletModule } from './wallet/wallet.module'
import { ArticleModule } from './article/article.module'
import { CommentModule } from './comment/comment.module'
import cloudinaryConfig from './cloudinary/cloudinary.config'
import { AdminitorModule } from './adminitor/adminitor.module'
import { CustomAuthMiddlware } from './middlewares/auth.middleware'
import { CloudinaryService } from './cloudinary/cloudinary.service'
import { ArticleMiddleware } from './middlewares/article.middleware'
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [cloudinaryConfig],
    }),
    AuthModule,
    JobModule,
    UserModule,
    ForumModule,
    WalletModule,
    AdvertModule,
    ArticleModule,
    CommentModule,
    AdminitorModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtService, PrismaService, CloudinaryService, SendRes, MiscService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CustomAuthMiddlware)
      .forRoutes(
        { path: 'news-feed', method: RequestMethod.GET },
        { path: 'advert/fetch', method: RequestMethod.GET },
        { path: 'user/forums/:username', method: RequestMethod.GET },
      )

    consumer
      .apply(ArticleMiddleware)
      .forRoutes(
        { path: 'article/fetch/:articleId', method: RequestMethod.GET },
        { path: 'comment/fetch/:articleId', method: RequestMethod.GET }
      )
  }
}
