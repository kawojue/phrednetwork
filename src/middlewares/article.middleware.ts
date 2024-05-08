import * as NodeCache from 'node-cache'
import { JwtService } from '@nestjs/jwt'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { PrismaService } from 'lib/prisma.service'
import { NextFunction, Request, Response } from 'express'
import { Injectable, NestMiddleware } from '@nestjs/common'

const userCache = new NodeCache({ stdTTL: 60 * 60 * 24 })

@Injectable()
export class ArticleMiddleware implements NestMiddleware {
    private response: SendRes
    private prisma: PrismaService
    private jwtService: JwtService

    constructor() {
        this.response = new SendRes()
        this.prisma = new PrismaService()
        this.jwtService = new JwtService()
    }

    private async validateAndDecodeToken(token: string) {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET
            })
        } catch {
            return null
        }
    }

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            const { articleId } = req.params
            const authHeader = req.headers.authorization

            let role: string | null = null
            let userId: string | null = null
            if (authHeader) {
                const token = authHeader.split(' ')[1]
                if (token) {
                    const decodedToken = await this.validateAndDecodeToken(token)
                    if (decodedToken) {
                        userId = decodedToken.sub
                        role = decodedToken.role
                    }
                }
            }

            const article = await this.prisma.article.findUnique({
                where: { id: articleId },
                select: { authorId: true, pending_approval: true },
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            let maxAccessAllowed = 2
            const userAccessCount: number = userCache.get(`${userId || 'anonymous'}-${articleId}`) as number || 0

            if (userId) {
                if (article.authorId === userId || role === 'admin' || role === 'auditor') {
                    maxAccessAllowed = Number.POSITIVE_INFINITY
                } else {
                    const membershipExpired = await this.prisma.isMembershipExpired(userId)
                    maxAccessAllowed = membershipExpired ? 4 : Number.POSITIVE_INFINITY
                }
            }

            if (userAccessCount >= maxAccessAllowed) {
                req.user = userId ? { sub: userId, role, membership: false, auth: true } : { auth: false, membership: false }
                return next()
            }

            if (userId && article.authorId !== userId && role !== 'admin' && role !== 'auditor') {
                if (article.pending_approval === true) {
                    return this.response.sendError(res, StatusCodes.Forbidden, 'Article is pending approval')
                }

                const newArticle = await this.prisma.article.update({
                    where: { id: articleId },
                    data: { views: { increment: 1 } },
                })

                if (newArticle.views % 100 === 0) {
                    await this.prisma.wallet.update({
                        where: { userId: article.authorId },
                        data: { balance: { increment: 10 } },
                    })
                }
            }

            if (userId) {
                userCache.set(`${userId}-${articleId}`, userAccessCount + 1)
                req.user = { sub: userId, role, membership: true, auth: true }
            } else {
                userCache.set(`anonymous-${articleId}`, userAccessCount + 1)
            }

            next()
        } catch (err) {
            console.error(err)
            this.response.sendError(res, StatusCodes.InternalServerError, "Something went wrong")
        }
    }
}
