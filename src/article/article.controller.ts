import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { ArticleService } from './article.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  Body, Controller, Post, Req, Res, Patch, UseInterceptors,
  UploadedFile, ParseFilePipe, Delete, Get, Param, UseGuards,
} from '@nestjs/common'
import { PublishArticleDto } from './dto/publish-article.dto'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) { }

  @ApiOperation({
    summary: 'This is to publish an article incl. the cover photo'
  })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @Post('/publish')
  @Role('user', 'admin', 'auditor')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @UseInterceptors(FileInterceptor('cover_photo'))
  async publishArticle(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: PublishArticleDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      })
    ) file: Express.Multer.File,
  ) {
    const header: FileDest = {
      // @ts-ignore
      folder: `Phrednetwork/${req.user.sub}`,
      resource_type: 'image'
    }

    return await this.articleService.publishArticle(res, req.user, header, file, body)
  }

  @ApiOperation({
    summary: 'This is to remove an article'
  })
  @ApiBearerAuth()
  @Delete('/remove/:articleId')
  @Role('user')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async removeArticle(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('articleId') articleId: string
  ) {
    return await this.articleService.removeArticle(res, articleId, req.user)
  }

  @ApiOperation({
    summary: 'This is to fetch an individual article. Pass a token and if not authenticated, pass an empty string'
  })
  @Get('/fetch/:articleId')
  async fetchArticle(
    @Req() req: Request,
    @Res() res: Response,
    @Param('articleId') articleId: string
  ) {
    // @ts-ignore
    return await this.articleService.fetchArticle(req, res, articleId)
  }

  @ApiOperation({
    summary: 'This is to toggle like on an article'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/toggle-like/:articleId')
  async toggleLikeOnArticle(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('articleId') articleId: string
  ) {
    return await this.articleService.toggleLikeOnArticle(res, articleId, req.user)
  }

  @ApiOperation({
    summary: 'This is to toggle bookmark for an article'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/toggle-bookmark/:articleId')
  async toggleBookmarkOnArticle(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('articleId') articleId: string
  ) {
    return await this.articleService.toggleBookmarkOnArticle(res, articleId, req.user)
  }
}
