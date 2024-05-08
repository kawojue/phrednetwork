import { Response } from 'express'
import { Roles } from '@prisma/client'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import {
  Patch, UploadedFile, Param, Query, Delete,
  Req, Res, UseGuards, UseInterceptors, Put,
  Controller, Get, ParseFilePipe, Post, Body,
} from '@nestjs/common'
import { DisapproveDto } from './dto/article.dto'
import { AnalyticsDto } from './dto/analytics.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { AdminitorService } from './adminitor.service'
import { FileInterceptor } from '@nestjs/platform-express'
import { UpdatePasswordDto } from 'src/auth/dto/password.dto'
import { LicenseSubmissionDto, UserSuspensionDto } from './dto/user.dto'
import { editAdminitorDto, InviteAdminitorDto } from './dto/invite-adminitordto'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { EmailDto, SigninDto, SignupDto, UpdateAdminitorProfile } from './dto/auth.dto'
import { AllAdvertsDto, AllArticlesDto, AllForumsDto, AllUsersDto } from './dto/infite-scroll.dto'

@ApiTags("Admin & Auditor")
@Controller('adminitor')
export class AdminitorController {
  constructor(private readonly adminitorService: AdminitorService) { }

  // @Post('/signup')
  // async signup(
  //   @Res() res: Response,
  //   @Body() body: SignupDto
  // ) {
  //   return await this.adminitorService.signup(res, body)
  // }

  @Post('/signin')
  async signin(
    @Res() res: Response,
    @Body() body: SigninDto
  ) {
    return await this.adminitorService.signin(res, body)
  }

  @UseInterceptors(FileInterceptor('avatar'))
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  @ApiConsumes('multipart/form-data', 'image/jpeg', 'image/png')
  @ApiOperation({
    summary: "The formdata key should be avatar"
  })
  @Put('/update-profile')
  async updateAdminitorProfile(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
      })
    ) file: Express.Multer.File,
    @Body() body: UpdateAdminitorProfile,
  ) {
    const header: FileDest = {
      folder: `Phrednetwork/${req.user.sub}`,
      resource_type: 'image'
    }

    return await this.adminitorService.updateAdminitorProfile(res, req.user, file, header, body)
  }

  @Get('/analytics')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async fetchAnalytics(
    @Res() res: Response,
    @Query() query: AnalyticsDto,
  ) {
    return await this.adminitorService.fetchAnalytics(res, query)
  }

  @Patch('/reset-password')
  async resetPassword(
    @Res() res: Response,
    @Body() { email }: EmailDto,
  ) {
    return await this.adminitorService.resetPassword(res, email)
  }

  @Patch('/update-password')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async updatePassword(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: UpdatePasswordDto,
  ) {
    return await this.adminitorService.updatePassword(res, req.user, body)
  }

  @Patch('/approve-article/:articleId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async approveArticle(
    @Res() res: Response,
    @Param('articleId') articleId: string
  ) {
    return await this.adminitorService.approveArticle(res, articleId)
  }

  @Patch('/disapprove-or-remove-aticle/:articleId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async disapproveOrRemoveArticle(
    @Res() res: Response,
    @Body() body: DisapproveDto,
    @Param('articleId') articleId: string
  ) {
    return await this.adminitorService.disapproveOrRemoveArticle(res, articleId, body)
  }

  @Get('/users/:userId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async getUserAndVerification(
    @Res() res: Response,
    @Param('userId') userId: string
  ) {
    return await this.adminitorService.getUserAndVerification(res, userId)
  }

  @Patch('/user/toggle-suspension/:userId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin)
  async toggleSuspendUser(
    @Res() res: Response,
    @Param('userId') userId: string,
    @Query() query: UserSuspensionDto
  ) {
    return await this.adminitorService.toggleSuspendUser(res, userId, query)
  }

  @Patch('/user/license-verification/:userId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin)
  async verifyLicenseSubmission(
    @Res() res: Response,
    @Param('userId') userId: string,
    @Query() query: LicenseSubmissionDto
  ) {
    return await this.adminitorService.verifyLicenseSubmission(res, userId, query)
  }

  @Patch('/user/advert-approval/:userId/:advertId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async approveOrDisApproveAdvert(
    @Res() res: Response,
    @Param('userId') userId: string,
    @Param('advertId') advertId: string,
    @Query() query: LicenseSubmissionDto
  ) {
    return await this.adminitorService.approveOrDisApproveAdvert(res, userId, advertId, query)
  }

  @Post('/user/approve-withdrawal/:userId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin)
  async approveWithdrawal(
    @Res() res: Response,
    @Param('userId') userId: string,
  ) {
    return await this.adminitorService.approveWithdrawal(res, userId)
  }

  @Get('/all-users')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async fetchAllUsers(
    @Res() res: Response,
    @Query() query: AllUsersDto
  ) {
    return await this.adminitorService.fetchAllUsers(res, query)
  }

  @Get('/all-articles')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async fetchAllArticles(
    @Res() res: Response,
    @Query() query: AllArticlesDto
  ) {
    return await this.adminitorService.fetchAllArticles(res, query)
  }

  @Get('/all-adverts')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async fetchAllAdverts(
    @Res() res: Response,
    @Query() query: AllAdvertsDto
  ) {
    return await this.adminitorService.fetchAllAdverts(res, query)
  }

  @Get('/all-forums')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async fetchAllForums(
    @Res() res: Response,
    @Query() query: AllForumsDto
  ) {
    return await this.adminitorService.fetchAllForums(res, query)
  }

  @Post('/invite')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin)
  async inviteAdminitor(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: InviteAdminitorDto,
  ) {
    return await this.adminitorService.inviteAdminitor(res, req.user, body)
  }

  @Post('/fetch')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.auditor)
  async listAdminitors(@Res() res: Response) {
    return await this.adminitorService.listAdminitors(res)
  }

  @Put('/edit/:adminitorId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin)
  async editAdminitor(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: editAdminitorDto,
    @Param('adminitorId') adminitorId: string
  ) {
    return await this.adminitorService.editAdminitor(res, adminitorId, req.user, body)
  }

  @Delete('/remove/:adminitorId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin)
  async removeAdminitor(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('adminitorId') adminitorId: string
  ) {
    return await this.adminitorService.removeAdminitor(res, adminitorId, req.user)
  }
}
