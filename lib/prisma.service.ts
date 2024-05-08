import { formatMembership } from 'helpers/formatTexts'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Article, Boosting, PrismaClient, Validation } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect()
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }

    async connectModels(id: string) {
        await Promise.all([
            this.wallet.create({ data: { user: { connect: { id } } } }),
            this.profile.create({ data: { user: { connect: { id } } } }),
            this.verification.create({ data: { user: { connect: { id } } } })
        ])
    }

    async isMembershipExpired(userId: string) {
        const currentDate = new Date()
        const membership = await this.membership.findUnique({
            where: { userId }
        })

        if (!membership) return true

        const membershipDurationInMonths = formatMembership(membership.duration)

        const expirationDate = new Date(membership.memberedAt)
        expirationDate.setMonth(expirationDate.getMonth() + membershipDurationInMonths)

        return currentDate > expirationDate
    }

    async hasPublishedTwiceToday(userId: string) {
        const currentDate = new Date()
        const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0)
        const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59)

        const count = await this.article.count({
            where: {
                authorId: userId,
                publishedAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        })

        return count >= 2
    }

    async isTokenExpired(validation: Validation) {
        const isExpired = new Date() > new Date(validation.token_expiry)
        if (isExpired) {
            await this.validation.delete({
                where: {
                    token: validation.token
                }
            })

            return true
        }

        return false
    }

    async isUsernameOrEmailExist(field: 'email' | 'username', param: string) {
        return await this.user.findFirst({
            where: {
                [field]: param
            }
        }) !== null
    }

    async findAdvertByCategoryOrTitle(article: Article) {
        return await this.advert.findFirst({
            where: {
                OR: [
                    { action_link: { contains: article.title, mode: 'insensitive' } },
                    { description: { contains: article.title, mode: 'insensitive' } },
                    { productName: { contains: article.title, mode: 'insensitive' } },
                    { productName: { contains: article.categoriesText, mode: 'insensitive' } },
                    { action_link: { contains: article.categoriesText, mode: 'insensitive' } },
                    { keywordsText: { contains: article.categoriesText, mode: 'insensitive' } },
                ],
                pending_approval: false,
                advert_expiry: { gte: new Date() }
            }
        })
    }

    async findAdvertByAuthor(article: Article) {
        return await this.advert.findFirst({
            where: {
                pending_approval: false,
                postedById: article.authorId,
                advert_expiry: { gte: new Date() }
            }
        })
    }

    async findRandomAdvert() {
        const activeAdverts = await this.advert.findMany({
            where: {
                advert_expiry: { gte: new Date() },
                pending_approval: false
            }
        })

        if (activeAdverts.length === 0) {
            return null
        }

        const randomIndex = Math.floor(Math.random() * activeAdverts.length)
        const randomAdvertId = activeAdverts[randomIndex].id

        return await this.advert.findUnique({ where: { id: randomAdvertId } })
    }

    async incrementEngagement(id: string) {
        await this.advert.update({
            where: { id },
            data: { engagement: { increment: 1 } }
        })
    }

    async manageBoosting(
        boosting: Boosting | null, expiryDate: Date,
        boostingPrice: number, articleId: string,
    ) {
        if (!boosting) {
            await this.boosting.create({
                data: {
                    boosting_point: 15,
                    boostedAt: new Date(),
                    amountPaid: boostingPrice,
                    boosting_expiry: expiryDate,
                    article: { connect: { id: articleId } }
                }
            })
        } else {
            const boosting_expiry = boosting.boosting_expiry
            const isExpired = new Date() > boosting_expiry

            if (isExpired) {
                await this.boosting.update({
                    where: { articleId },
                    data: {
                        boosting_point: 15,
                        boostedAt: new Date(),
                        amountPaid: boostingPrice,
                        boosting_expiry: expiryDate,
                    }
                })
            } else {
                await this.boosting.update({
                    where: { articleId },
                    data: {
                        boostedAt: new Date(),
                        amountPaid: boostingPrice,
                        boosting_expiry: expiryDate,
                        boosting_point: { increment: 15 },
                    }
                })
            }
        }
    }
}