import { Response } from 'express'
import { TxHistory } from '@prisma/client'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PlunkService } from 'lib/plunk.service'
import { PrismaService } from 'lib/prisma.service'
import { genRandomCode } from 'helpers/genRandStr'
import { formatMembershipAmount } from 'helpers/formatTexts'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { BoostingDto, MembershipDto } from './dto/resource.dto'
import { FundWalletDTO, RequestWithrawalDto } from './dto/wallet.dto'

@Injectable()
export class WalletService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService,
    ) { }

    async requestWithrawal(
        res: Response,
        { sub }: ExpressUser,
        { amountToWithdraw }: RequestWithrawalDto
    ) {
        try {
            const wallet = await this.prisma.wallet.findUnique({
                where: { userId: sub }
            })

            if (!wallet) {
                return this.response.sendError(res, StatusCodes.NotFound, "Wallet not found")
            }

            const profile = await this.prisma.profile.findUnique({
                where: { userId: sub },
                include: { accountDetail: true }
            })

            if (!profile.accountDetail) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your account details to withdraw')
            }

            amountToWithdraw = Number(amountToWithdraw)

            if (amountToWithdraw > wallet.balance) {
                return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Insufficient balance")
            }

            if (amountToWithdraw < 50) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Minimum withdrawal amount is ₦50.00")
            }

            await this.prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    requestingWithdrawal: true,
                    lastRequestedAt: new Date(),
                    balance: { decrement: amountToWithdraw },
                    amountToWithdraw: { increment: amountToWithdraw },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Withdrawal request has been sent" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async manageTransferEvents(body: TransferEvent) {
        const data = body.data
        try {
            const transaction = await this.getTransaction(data.reference)

            if (transaction) {
                await this.updateTransactionStatus(transaction, data.status)

                const amount = this.calculateTotalAmount(data.amount, transaction.totalFee)

                if (body.event === 'transfer.reversed' || body.event === 'transfer.failed') {
                    await this.updateUserBalance(transaction.walletId, amount)
                }
            }
        } catch (err) {
            throw err
        }
    }

    private async getTransaction(reference: string) {
        return await this.prisma.txHistory.findUnique({
            where: { reference }
        })
    }

    private async updateTransactionStatus(tx: TxHistory, status: string) {
        await this.prisma.txHistory.update({
            where: { id: tx.id },
            data: { status }
        })
    }

    private calculateTotalAmount(amount: number, totalFee: number) {
        const KOBO = 100 as const
        return (amount / KOBO) + totalFee
    }

    private async updateUserBalance(walletId: string, amount: number) {
        await this.prisma.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: amount } }
        })
    }

    async boostArticle(
        res: Response,
        articleId: string,
        { sub }: ExpressUser,
        { days }: BoostingDto
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId,
                    authorId: sub,
                },
                include: { boosting: true }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const wallet = await this.prisma.wallet.findUnique({
                where: { userId: sub }
            })

            if (!wallet) {
                return this.response.sendError(res, StatusCodes.NotFound, "Wallet not found")
            }

            const boostingPrice = this.misc.calculateBoostingPrice(days)

            const currentDate = new Date()
            let expiryDate = new Date(currentDate)
            expiryDate.setDate(currentDate.getDate() + days)

            if (wallet.balance < boostingPrice) {
                return this.response.sendError(res, StatusCodes.UnprocessableEntity, 'Insufficient funds')
            }

            await this.prisma.manageBoosting(article.boosting, expiryDate, boostingPrice, articleId)

            await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: boostingPrice } }
                }),
                this.prisma.txHistory.create({
                    data: {
                        reference: `boosting-${article.authorId}-${genRandomCode()}`,
                        type: 'RESOURCE',
                        amount: boostingPrice,
                        source: 'wallet',
                        status: 'SUCCESS',
                        wallet: { connect: { id: wallet.id } }
                    }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Article has been boosted" })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error boosting article")
        }
    }

    async becomeAMember(
        res: Response,
        { sub }: ExpressUser,
        { duration }: MembershipDto
    ) {
        try {
            const wallet = await this.prisma.wallet.findUnique({
                where: { userId: sub }
            })

            if (!wallet) {
                return this.response.sendError(res, StatusCodes.NotFound, "Wallet not found")
            }

            const isMembershipExpired = await this.prisma.isMembershipExpired(sub)

            if (!isMembershipExpired) {
                return this.response.sendError(res, StatusCodes.Conflict, "You're still an active member")
            }

            const amount = formatMembershipAmount(duration)

            if (wallet.balance < amount) {
                return this.response.sendError(res, StatusCodes.UnprocessableEntity, 'Insufficient funds')
            }

            await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: amount } }
                }),
                this.prisma.membership.upsert({
                    where: { userId: sub },
                    create: {
                        memberedAt: new Date(),
                        duration, amountPaid: amount,
                        user: { connect: { id: sub } }
                    },
                    update: {
                        memberedAt: new Date(),
                        duration, amountPaid: amount,
                    }
                }),
                this.prisma.txHistory.create({
                    data: {
                        amount,
                        type: 'RESOURCE',
                        source: 'wallet',
                        status: 'SUCCESS',
                        reference: `membership-${sub}-${genRandomCode()}`,
                        wallet: { connect: { id: wallet.id } }
                    }
                }),
            ])

            this.response.sendSuccess(res, StatusCodes.OK, { message: "You're now a member" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fundWallet(
        res: Response,
        { sub }: ExpressUser,
        { ref }: FundWalletDTO
    ) {
        try {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId: sub } })

            if (!wallet) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Wallet not found')
            }

            const verifyTx = await this.paystack.verifyTransaction(ref)
            if (!verifyTx.status || verifyTx?.data?.status !== "success") {
                return this.response.sendError(res, StatusCodes.PaymentIsRequired, 'Payment is required')
            }

            const { data } = verifyTx
            const amountPaid = data.amount / 100
            const channel = data?.authorization?.channel
            const authorization_code = data?.authorization?.authorization_code

            const [_, tx] = await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { userId: sub },
                    data: { balance: { increment: amountPaid } }
                }),
                this.prisma.txHistory.create({
                    data: {
                        channel,
                        type: 'DEPOSIT',
                        source: 'external',
                        status: 'SUCCESS',
                        amount: amountPaid,
                        authorization_code,
                        reference: `deposit-${sub}-${genRandomCode()}`,
                        wallet: { connect: { id: wallet.id } },
                    }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: tx
            })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }
}
