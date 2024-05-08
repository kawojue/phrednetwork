import { Roles } from '@prisma/client'
import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { AdvertService } from './advert.service'
import { PostAdvertDto } from './dto/advert.dtc'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import {
  Body, Controller, Get, Param, Post, Query, Delete,
  Res, UploadedFile, UseGuards, UseInterceptors, Req,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { InfiniteScrollDto } from 'src/adminitor/dto/infite-scroll.dto'

@ApiTags("Advert")
@Controller('advert')
export class AdvertController {
  constructor(private readonly advertService: AdvertService) { }

  @Get('/fetch/:username')
  async fetchAdverts(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: InfiniteScrollDto,
    @Param('username') username: string,
  ) {
    return await this.advertService.fetchAdverts(req, res, username, query)
  }

  @Post('/post')
  @ApiBearerAuth()
  @ApiConsumes('multipart/formdata')
  @UseInterceptors(FileInterceptor('prod_img'))
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  async postAdvert(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: PostAdvertDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return await this.advertService.postAdvert(res, req.user, file, body)
  }

  @Delete('/delete/:advertId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  @ApiBearerAuth()
  async removeAdvert(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('advertId') advertId: string
  ) {
    return await this.advertService.removeAdvert(res, advertId, req.user)
  }
}
