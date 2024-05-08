import { Response } from 'express'
import { ObjectId } from 'mongodb'
import { JwtService } from '@nestjs/jwt'
import { USER_REGEX } from 'utils/regExp'
import { genToken } from 'helpers/genToken'
import { Injectable } from '@nestjs/common'
import { SendRes } from './sendRes.service'
import StatusCodes from 'enums/StatusCodes'
import { PrismaService } from './prisma.service'
import { genRandomCode } from 'helpers/genRandStr'
import { Validation, Verification } from '@prisma/client'

@Injectable()
export class MiscService {
    private response: SendRes
    private prisma: PrismaService

    constructor(private readonly jwtService: JwtService) {
        this.response = new SendRes()
        this.prisma = new PrismaService()
    }

    async generateAccessToken({ username, sub, role, userStatus }: JwtPayload) {
        return await this.jwtService.signAsync({ username, sub, role, userStatus })
    }

    isValidUsername(username: string) {
        return USER_REGEX.test(username)
    }

    genenerateToken(id: string) {
        const randomCode = genRandomCode()
        const tk = genToken(id, randomCode)
        const token = Buffer.from(tk.token).toString('base64')

        return {
            token,
            randomCode,
            token_expiry: tk.token_expiry
        }
    }

    async validateToken(recv_token: string, validation: Validation) {
        const decodedToken = atob(recv_token)
        const token = genToken(validation?.userId, validation?.randomCode)

        return token.token === decodedToken
    }

    handleServerError(res: Response, err?: any, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || 'Something went wrong')
    }

    handlePaystackAndServerError(res: Response, err: any) {
        if (err.response?.message) {
            console.error(err)
            this.response.sendError(res, err.status, err.response.message)
        } else {
            this.handleServerError(res, err)
        }
    }

    async validateAndDecodeToken(token: string) {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET
            })
        } catch {
            return null
        }
    }

    async calculateReadingTime(content: string) {
        const base64Pattern: RegExp = /data:image\/[^]+base64[^'"]*/g
        const cleanedContent: string = content.replace(base64Pattern, '')
        const words: string[] = cleanedContent.split(/\s+/).filter(word => word !== '')
        const wordCount: number = words.length
        const wordPerMinute = 200 as const
        const readingTime: number = Math.ceil(wordCount / wordPerMinute)

        if (readingTime <= 1) {
            return '1 Min Read'
        } else if (readingTime >= 60) {
            return `${Math.round(readingTime / 60)} Hr Read`
        } else {
            return `${readingTime} Mins Read`
        }
    }

    licenseVerificationStatus(verification: Verification) {
        let verification_status: 'SUCCESS' | 'PENDING' | 'NOT VERIFIED'

        if (verification.verified) {
            verification_status = 'SUCCESS'
        } else if (!verification.verified && (!verification.licenseNumber || !verification.specialty)) {
            verification_status = 'NOT VERIFIED'

        } else {
            verification_status = 'PENDING'
        }

        return verification_status
    }

    async calculateWithdrawalFee(amount: number) {
        let processsingFee = amount * 0.05

        if (processsingFee > 50) {
            processsingFee = 50
        }

        let fee = { processsingFee } as {
            totalFee: number
            paystackFee: number
            processsingFee: number
        }

        if (amount > 5_000) {
            fee.paystackFee = 10
        } else {
            fee.paystackFee = amount <= 50_000 ? 25 : 50
        }

        return { ...fee, totalFee: fee.paystackFee + fee.processsingFee }
    }

    calculateBoostingPrice(days: number) {
        const amount = (days / 7) * 500

        return amount
    }

    async getAdvert(articleId: string) {
        const article = await this.prisma.article.findUnique({
            where: { id: articleId }
        })

        if (!article) return null

        let advert = await this.prisma.findAdvertByCategoryOrTitle(article)

        if (!advert) advert = await this.prisma.findAdvertByAuthor(article)

        if (!advert) advert = await this.prisma.findRandomAdvert()

        if (advert) await this.prisma.incrementEngagement(advert.id)

        return advert
    }

    generateRandomIndices(totalCount: number, limit: number): number[] {
        const indices = []

        for (let i = 0; i < limit; i++) {
            const randomIndex = Math.floor(Math.random() * totalCount)
            indices.push(randomIndex)
        }

        return indices
    }

    async fetchRandomArticles(limit: number) {
        try {
            const activeArticles = await this.prisma.article.findMany({
                where: { pending_approval: false }
            })

            const randomIndices = this.generateRandomIndices(activeArticles.length, limit)

            const randomArticles = await Promise.all(randomIndices.map(async index => {
                return await this.prisma.article.findUnique({
                    where: { id: new ObjectId(activeArticles[index].id).toString() },
                    select: {
                        id: true,
                        title: true,
                        views: true,
                        content: true,
                        categories: true,
                        coverPhoto: true,
                        readingTime: true,
                        publishedAt: true,
                        author: {
                            select: {
                                id: true,
                                username: true,
                                fullname: true,
                                profile: {
                                    select: {
                                        avatar: true
                                    }
                                }
                            }
                        },
                        adminitor: {
                            select: {
                                id: true,
                                avatar: true,
                                fullname: true,
                            }
                        }
                    }
                })
            }))

            return randomArticles
        } catch (err) {
            throw err
        }
    }
}