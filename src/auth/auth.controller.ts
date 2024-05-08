import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { AuthService } from './auth.service'
import { AuthGuard } from '@nestjs/passport'
import { SendRes } from 'lib/sendRes.service'
import { PrismaService } from 'lib/prisma.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { UpdateProfileDto } from './dto/profile.dto'
import { AccountDetailDto } from './dto/acc-detail.dto'
import { VerificationDto } from './dto/verification.dto'
import {
  Patch, Put, UploadedFiles, Get, Post, Param, Body, Res, Query, Req,
  UseGuards, Controller, ParseFilePipe, UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express'
import { LoginDto, RequestTokenDto, SignupDto, TokenDto } from './dto/auth.dto'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResetPasswordDto, UpdatePasswordDto, ResetPasswordTokenDto } from './dto/password.dto'

@ApiTags("Auth")
@Controller('auth')
export class AuthController {
  constructor(
    private readonly response: SendRes,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) { }

  @Post('/signup')
  async signup(@Res() res: Response, @Body() body: SignupDto) {
    return await this.authService.signup(res, body)
  }

  @Post('/login')
  async login(@Res() res: Response, @Body() body: LoginDto) {
    return await this.authService.login(res, body)
  }

  @Get('/verify-email')
  async verifyEmail(@Res() res: Response, @Query() { token }: TokenDto) {
    return await this.authService.verifyEmail(res, token)
  }

  @Get('/request-token')
  async requestToken(@Res() res: Response, @Query() query: RequestTokenDto) {
    return await this.authService.requestToken(res, query)
  }

  @Patch('/reset-password')
  async resetPassword(
    @Res() res: Response,
    @Body() body: ResetPasswordDto,
    @Query() query: ResetPasswordTokenDto,
  ) {
    return await this.authService.resetPassword(res, body, query)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  @Patch('/update-password')
  async updatePassword(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: UpdatePasswordDto
  ) {
    return await this.authService.updatePassword(res, req.user as ExpressUser, body)
  }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: "If profile picture is sent with the request body as FormData, the key should avatar"
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  @UseInterceptors(FileInterceptor('avatar'))
  @Put('/update-profile')
  async updateProfile(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
      })
    ) file: Express.Multer.File,
    @Body() body: UpdateProfileDto,
  ) {
    const header: FileDest = {
      folder: `Phrednetwork/${req.user.sub}`,
      resource_type: 'image'
    }

    return await this.authService.updateProfile(res, req.user, file, header, body)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  @Patch('/toggle-follow/:targetId')
  async toggleFollow(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('targetId') targetId: string
  ) {
    return await this.authService.toggleFollow(res, targetId, req.user)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  @Patch('/populate/account-details')
  async populateAccountDetails(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: AccountDetailDto
  ) {
    return await this.authService.populateAccountDetails(res, req.user, body)
  }

  @Get('/email-exist/:email')
  async emailExist(@Res() res: Response, @Param('email') email: string) {
    const isExist = this.prisma.isUsernameOrEmailExist('email', email)

    if (isExist) {
      return this.response.sendError(res, StatusCodes.Conflict, 'There is an account accociated with this email')
    }

    this.response.sendSuccess(res, StatusCodes.OK, {
      message: "Email is available"
    })
  }

  @Get('username-exist/:username')
  async usernameExist(res: Response, @Param('username') username: string) {
    const isExist = this.prisma.isUsernameOrEmailExist('username', username)

    if (isExist) {
      return this.response.sendError(res, StatusCodes.Conflict, 'Username has been taken')
    }

    this.response.sendSuccess(res, StatusCodes.OK, {
      message: "Username is available"
    })
  }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: "If attachements are sent with the request body as FormData, then the key should attachements"
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  @UseInterceptors(AnyFilesInterceptor())
  @Post('license-submission')
  async licenseSubmission(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() verifDto: VerificationDto,
    @UploadedFiles() attachments: Array<Express.Multer.File>
  ) {
    return await this.authService.licenseSubmission(res, req.user, verifDto, attachments || [])
  }
}
