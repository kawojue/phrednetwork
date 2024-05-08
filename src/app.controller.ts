import { AppService } from './app.service'
import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { PrismaService } from 'lib/prisma.service'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { newsFeedDto } from './adminitor/dto/infite-scroll.dto'
import { Controller, Get, Query, Req, Res } from '@nestjs/common'

@Controller()
@ApiTags("App")
export class AppController {
  constructor(
    private readonly response: SendRes,
    private readonly prisma: PrismaService,
    private readonly appService: AppService,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Get('/news-feed')
  async newsFeed(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: newsFeedDto,
  ) {
    return await this.appService.newsFeed(req, res, query)
  }

  @Get('/discoveries')
  async discoveryPage(@Res() res: Response) {
    return await this.appService.discoveryPage(res)
  }

  @ApiOperation({
    summary: 'This is to fetch categories for user to select'
  })
  @Get('/categories')
  async fetchCategories(@Res() res: Response) {
    this.response.sendSuccess(res, StatusCodes.OK, {
      data: await this.prisma.categories.findMany()
    })
  }
}
