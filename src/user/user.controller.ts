import {
  Controller, Get, Param,
  Query, Req, Res, UseGuards
} from '@nestjs/common'
import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import { UserService } from './user.service'
import { FollowDto } from './dto/follow.dto'
import { AuthGuard } from '@nestjs/passport'
import { ArticlesDto } from './dto/articles.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { GlobalSearchDto, SearchDto } from './dto/search.dto'
import { GetBankNameDto, ValidateBankDto } from './dto/bank.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('/verify-bank')
  async bankAccountVerification(@Res() res: Response, @Query() query: ValidateBankDto) {
    return await this.userService.bankAccountVerification(res, query)
  }

  @Get('/banks')
  async fetchBanks(@Res() res: Response) {
    return await this.userService.fetchBanks(res)
  }

  @Get('/bank')
  async fetchBank(@Res() res: Response, @Query() { bankCode }: GetBankNameDto) {
    return await this.userService.fetchBankByBankCode(res, bankCode)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/account-detail')
  async fetchAccountDetail(@Req() req: IRequest, @Res() res: Response) {
    return await this.userService.fetchAccountDetail(res, req.user)
  }

  @ApiOperation({
    summary: 'This is to fetch the list of followers in /profile'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/followers')
  @Role('user')
  async fetchFollowers(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: FollowDto,
  ) {
    return await this.userService.fetchFollowers(res, req.user, query)
  }

  @ApiOperation({
    summary: 'This is to fetch the list of following in /profile/{username}'
  })
  @Get('/following/:username')
  async fetchFollowing(
    @Res() res: Response,
    @Query() query: FollowDto,
    @Param('username') username: string,
  ) {
    return await this.userService.fetchFollowing(res, username, query)
  }

  @ApiOperation({
    summary: 'This is to fetch my profile'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  @Get('/my-profile')
  async myProfile(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    return await this.userService.myProfile(res, req.user)
  }

  @ApiOperation({
    summary: "This is to fetch the user's profile /{username}"
  })
  @Get('/profile/:username')
  async userProfile(
    @Res() res: Response,
    @Req() req: Request,
    @Param('username') username: string,
  ) {
    return await this.userService.userProfile(res, req, username)
  }

  @ApiOperation({
    summary: "Fetches the user's articles"
  })
  @Get('/articles/:username')
  async fetchArticles(
    @Res() res: Response,
    @Query() query: ArticlesDto,
    @Param('username') username: string,
  ) {
    return await this.userService.fetchArticles(res, username, query)
  }

  @ApiOperation({
    summary: "Fetches the user's bookmarked articles"
  })
  @Get('/bookmarks')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  async fetchBookmarks(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    return await this.userService.fetchBookmarks(res, req.user)
  }

  @Get('/global-search')
  async globalSearch(
    @Res() res: Response,
    @Query() query: GlobalSearchDto
  ) {
    return await this.userService.globalSearch(res, query)
  }

  @ApiOperation({
    summary: "Fetches the user's notifications (last 7 days only)"
  })
  @Get('/notifications')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  async fetchNotifications(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    return await this.userService.fetchNotifications(res, req.user)
  }

  @ApiOperation({
    summary: "Fetches all the forums the user is participating in"
  })
  @Get('/forums/:username')
  async fetchForums(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: SearchDto,
    @Param('username') username: string,
  ) {
    return await this.userService.fetchForums(req, res, username, query)
  }
}
