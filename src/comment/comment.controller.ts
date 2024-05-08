import { Roles } from '@prisma/client'
import {
  Controller, Delete, Param, Body, Get,
  Patch, Post, Query, Req, Res, UseGuards,
} from '@nestjs/common'
import { Role } from 'src/role.decorator'
import { ReplyDto } from './dto/reply.dto'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { CommentService } from './comment.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { CommentDto, FetchCommentsDto } from './dto/comment.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags("Comment")
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) { }

  @ApiOperation({
    summary: 'This is to remove a comment from an article'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.user)
  @Delete('/remove/:articleId/:commentId')
  async removeCommentOnArticle(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string,
  ) {
    return await this.commentService.removeCommentOnArticle(res, articleId, commentId, req.user)
  }

  @ApiOperation({
    summary: 'This is to add a comment on article'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  @Post('/add/:articleId')
  async addCommentOnArticle(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CommentDto,
    @Param('articleId') articleId: string,
  ) {
    return await this.commentService.addCommentOnArticle(res, articleId, req.user, body)
  }

  @ApiOperation({
    summary: 'This is to fetch the comments on an article (not all). Just 15 per page by default'
  })
  @Get('/fetch/:articleId')
  async fetchComments(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: FetchCommentsDto,
    @Param('articleId') articleId: string
  ) {
    return await this.commentService.fetchComments(req, res, articleId, query)
  }

  @ApiOperation({
    summary: 'This is to toggle like on a comment in an article'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  @Patch('/toggle-like/:articleId/:commentId')
  async toggleLikeOnComment(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string,
  ) {
    return await this.commentService.toggleLikeOnComment(res, articleId, commentId, req.user)
  }

  @ApiOperation({
    summary: 'This is to add a reply to a comment in an article'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  @Post('/reply/add/:articleId/:commentId')
  async addReply(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string,
    @Body() body: ReplyDto,
  ) {
    return await this.commentService.addReply(res, articleId, commentId, req.user, body)
  }

  @ApiOperation({
    summary: 'This is to remove a reply from a comment in an article'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.user)
  @Delete('/reply/remove/:articleId/:commentId/:replyId')
  async removeReply(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('replyId') replyId: string,
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string,
  ) {
    return await this.commentService.removeReply(res, replyId, articleId, commentId, req.user)
  }

  @ApiOperation({
    summary: 'This is to fetch the replies of a comment in an article (not all). Just 15 per page by default'
  })
  @Get('/reply/fetch/:articleId/:commentId')
  async fetchReplies(
    @Res() res: Response,
    @Query() query: FetchCommentsDto,
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string
  ) {
    return await this.commentService.fetchReplies(res, articleId, commentId, query)
  }
}
