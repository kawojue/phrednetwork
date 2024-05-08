import { Request, Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PostAdvertDto } from './dto/advert.dtc'
import { PrismaService } from 'lib/prisma.service'
import { genRandomCode } from 'helpers/genRandStr'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { InfiniteScrollDto } from 'src/adminitor/dto/infite-scroll.dto'

@Injectable()
export class AdvertService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    async fetchAdverts(
        req: Request,
        res: Response,
        username: string,
        { search = '', page = 1, limit = 10 }: InfiniteScrollDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit
            // @ts-ignore
            const userId = req.user?.sub
            let adverts = []

            const user = await this.prisma.user.findUnique({
                where: { username: username.trim().toLowerCase() }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User with the username not found')
            }

            if (userId) {
                adverts = await this.prisma.advert.findMany({
                    where: {
                        postedById: userId,
                        OR: [
                            { productName: { contains: search, mode: 'insensitive' } },
                            { keywordsText: { contains: search, mode: 'insensitive' } }
                        ],
                    },
                    skip: offset,
                    take: limit,
                })
            } else {
                adverts = await this.prisma.advert.findMany({
                    where: {
                        postedById: user.id,
                        pending_approval: false,
                        OR: [
                            { productName: { contains: search, mode: 'insensitive' } },
                            { keywordsText: { contains: search, mode: 'insensitive' } }
                        ],
                    },
                    skip: offset,
                    take: limit,
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: adverts })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async postAdvert(
        res: Response,
        { sub }: ExpressUser,
        file: Express.Multer.File,
        {
            action_link, keyword,
            productName, description,
        }: PostAdvertDto,
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Product image is required')
            }

            const MAX_SIZE = 5 << 20
            if (file.size > MAX_SIZE) {
                return this.response.sendError(res, StatusCodes.PayloadTooLarge, 'Image too large')
            }

            if (!['jpg', 'png'].includes(file.originalname.split('.').pop())) {
                return this.response.sendError(res, StatusCodes.UnsupportedContent, "File extension is not allowed")
            }

            const user = await this.prisma.user.findUnique({
                where: { id: sub },
                include: { wallet: true }
            })

            if (!user || !user?.wallet) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            const currentDate = new Date()
            const expiryDate = new Date(currentDate)
            expiryDate.setDate(currentDate.getDate() + 14)

            const amount = 1_200
            const header: FileDest = {
                resource_type: 'image',
                folder: `Phrednetwork/advert/${sub}`,
            }

            const keywords = JSON.parse(keyword.replace(/'/g, '"')) as Array<string>

            if (user.wallet.balance < amount) {
                return this.response.sendError(res, StatusCodes.UnprocessableEntity, 'Insufficient funds')
            }

            const uploadRes = await this.cloudinary.upload(file, header)

            await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { id: user.wallet.id },
                    data: { balance: { decrement: amount } }
                }),
                this.prisma.advert.create({
                    data: {
                        description, keywords,
                        pending_approval: true,
                        advert_expiry: expiryDate,
                        action_link, productImage: {
                            public_url: uploadRes.url,
                            public_id: uploadRes.public_id,
                            secure_url: uploadRes.secure_url,
                        },
                        amountPaid: amount, productName,
                        keywordsText: keywords.join(', '),
                        postedBy: { connect: { id: sub } }
                    },
                }),
                this.prisma.txHistory.create({
                    data: {
                        amount,
                        type: 'RESOURCE',
                        source: 'wallet',
                        status: 'SUCCESS',
                        reference: `membership-${sub}-${genRandomCode()}`,
                        wallet: { connect: { id: user.wallet.id } }
                    }
                }),
            ])

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Advert posted. Waiting for approval" })
        } catch (err) {
            this.misc.handleServerError(res, err, "An error occured while posting an advert")
        }
    }

    async removeAdvert(
        res: Response,
        advertId: string,
        { sub, role }: ExpressUser,
    ) {
        try {
            const advert = await this.prisma.advert.findUnique({
                where: { id: advertId }
            })

            if (!advert) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Advert not found')
            }

            if (role !== 'admin' || sub === advert.postedById) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Can't delete an advert")
            }

            const prod_img = advert.productImage
            if (prod_img?.public_id) {
                await this.cloudinary.delete(prod_img.public_id)
            }

            await this.prisma.advert.delete({
                where: { id: advert.id }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Advert has been deleted successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "An error occured while deleting an advert")
        }
    }
}
