import { query, Response } from 'express'
import { Roles } from '@prisma/client'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { ForumService } from './forum.service'
import { RequestDto } from './dto/request.dto'
import { CreateForumDto } from './dto/create.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { SendMessageDto } from './dto/send-msg.dto'
import {
  ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags
} from '@nestjs/swagger'
import {
  Body, Controller, Get, Param, Patch, Post, Query,
  Res, UploadedFile, UseGuards, UseInterceptors, Req,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { InfiniteScrollDto } from 'src/adminitor/dto/infite-scroll.dto'

@ApiTags("Forum")
@Controller('forum')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ForumController {
  constructor(private readonly forumService: ForumService) { }

  @Post('/create')
  @Role(Roles.user)
  @ApiConsumes('multipart/formdata')
  @UseInterceptors(FileInterceptor('profile_image'))
  async createForum(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: CreateForumDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.forumService.createForum(res, req.user, file, body)
  }

  @Patch('/send-message/:forumId')
  @Role(Roles.user)
  async sendMessage(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: SendMessageDto,
    @Param('forumId') forumId: string,
  ) {
    return await this.forumService.sendMessage(res, forumId, req.user, body)
  }

  @Get('/fetch-messages/:forumId')
  @Role(Roles.user)
  async fetchForumMessages(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('forumId') forumId: string,
    @Query() query: InfiniteScrollDto,
  ) {
    return await this.forumService.fetchForumMessages(res, forumId, req.user, query)
  }

  @ApiOperation({
    summary: 'This is to request to join a forum from the forum owner'
  })
  @Post('/request-join/:forumId')
  @Role(Roles.user)
  async requestToJoinForum(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('forumId') forumId: string,
  ) {
    return await this.forumService.requestToJoinForum(res, forumId, req.user)
  }

  @ApiOperation({
    summary: 'This is to accept or decline the requester'
  })
  @Post('/manage-join/:forumId/:requestId')
  @Role(Roles.user)
  async manageJoinRequest(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: RequestDto,
    @Param('forumId') forumId: string,
    @Param('requestId') requestId: string,
  ) {
    return await this.forumService.manageJoinRequest(res, forumId, requestId, req.user, query)
  }

  @ApiOperation({
    summary: 'This is to fetch all requesters so they can get accept or decline'
  })
  @Role(Roles.user)
  @Get('/requesters')
  async fetchRequesters(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    return await this.forumService.fetchRequesters(res, req.user)
  }
}
