import { Roles } from '@prisma/client'
import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { AuthGuard } from '@nestjs/passport'
import { WalletService } from './wallet.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { BoostingDto, MembershipDto } from './dto/resource.dto'
import {
  Body, Controller, HttpException, Param, Post, Req, Res, UseGuards
} from '@nestjs/common'
import { FundWalletDTO, RequestWithrawalDto } from './dto/wallet.dto'

@ApiTags("Wallet")
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @ApiBearerAuth()
  @Post('/request-withdrawal')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  async requestWithrawal(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: RequestWithrawalDto
  ) {
    return await this.walletService.requestWithrawal(res, req.user, body)
  }

  @ApiBearerAuth()
  @Post('/fund')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  async fundWallet(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: FundWalletDTO
  ) {
    return await this.walletService.fundWallet(res, req.user, body)
  }

  @Post('/paystack/transfer-webhook')
  async manageFiatEvents(@Req() req: Request) {
    if (!req.body || !req.body?.event || !req.body?.data) {
      throw new HttpException('Invalid request body received', StatusCodes.Unauthorized)
    }

    const secretHash = req.headers['x-webhook-pred']
    const decodedHash = atob(secretHash as string)

    if (decodedHash === process.env.PS_WEBHOOK_SECRET) {
      try {
        return await this.walletService.manageTransferEvents(req.body)
      } catch (err) {
        console.error(err)
        throw new HttpException("Something went wrong", StatusCodes.InternalServerError)
      }
    }
  }

  @ApiBearerAuth()
  @Post('/boost/:articleId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  async boostArticle(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: BoostingDto,
    @Param("articleId") articleId: string,
  ) {
    return await this.walletService.boostArticle(res, articleId, req.user, body)
  }

  @ApiBearerAuth()
  @Post('/become-member')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.user)
  async becomeAMember(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: MembershipDto,
  ) {
    return await this.walletService.becomeAMember(res, req.user, body)
  }
}
