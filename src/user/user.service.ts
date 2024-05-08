import { Request, Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { FollowDto } from './dto/follow.dto'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { ArticlesDto } from './dto/articles.dto'
import { ValidateBankDto } from './dto/bank.dto'
import { PrismaService } from 'lib/prisma.service'
import { formatNumber } from 'helpers/formatTexts'
import { GlobalSearchDto, SearchDto } from './dto/search.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'

@Injectable()
export class UserService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService,
    ) { }

    async fetchFollowers(
        res: Response,
        { sub }: ExpressUser,
        { limit = 5, page = 1 }: FollowDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const followers = await this.prisma.follow.findMany({
                where: {
                    followingId: sub
                },
                take: limit,
                skip: offset,
                select: {
                    follower: {
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
                    }
                }
            })

            const followersLength = await this.prisma.follow.count({
                where: {
                    followingId: sub
                }
            })

            const followingLength = await this.prisma.follow.count({
                where: {
                    followerId: sub
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: followers,
                followersLength,
                followingLength: `${formatNumber(followingLength)} Following`,
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error fetching followers')
        }
    }

    async fetchFollowing(
        res: Response,
        username: string,
        { limit = 5, page = 1 }: FollowDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const user = await this.prisma.user.findUnique({
                where: { username }
            })
            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            const following = await this.prisma.follow.findMany({
                where: {
                    followerId: user.id
                },
                take: limit,
                skip: offset,
                select: {
                    following: {
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
                    }
                }
            })

            const followersLength = await this.prisma.follow.count({
                where: {
                    followingId: user.id
                }
            })

            const followingLength = await this.prisma.follow.count({
                where: {
                    followerId: user.id
                }
            })

            const follow = await Promise.all(following.map((fol) => {
                return fol.following
            }))

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: follow,
                followingLength,
                followersLength: `${formatNumber(followersLength)} Followers`,
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error fetching following')
        }
    }

    async myProfile(
        res: Response,
        { sub }: ExpressUser
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    fullname: true,
                    verification: {
                        select: {
                            verified: true,
                            email_verified: true,
                        }
                    },
                    wallet: {
                        select: {
                            balance: true
                        }
                    },
                    profile: {
                        select: {
                            bio: true,
                            avatar: true,
                        }
                    },
                }
            })

            const verification = this.prisma.verification.findUnique({
                where: { userId: sub }
            })

            const totalArticles = await this.prisma.article.count({
                where: { authorId: user.id }
            })

            const allUnreadNotifications = await this.prisma.notification.count({
                where: {
                    userId: sub,
                    read: false,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: user,
                totalArticles,
                hasUnreadNotifications: allUnreadNotifications > 0,
                verification_status: this.misc.licenseVerificationStatus(await verification),
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error fetching profile')
        }
    }

    async userProfile(
        res: Response,
        req: Request,
        username: string,
    ) {
        try {
            let userId: string | null = null

            const authHeader = req.headers.authorization
            if (authHeader) {
                const token = authHeader.split(' ')[1]
                if (token) {
                    const decodedToken = await this.misc.validateAndDecodeToken(token)
                    if (decodedToken) {
                        userId = decodedToken.sub
                    }
                }
            }

            if (userId) {
                const user = await this.prisma.user.findUnique({
                    where: { username },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        fullname: true,
                        verification: {
                            select: {
                                verified: true,
                                email_verified: true,
                            }
                        },
                        profile: {
                            select: {
                                bio: true,
                                avatar: true,
                            }
                        },
                        following: {
                            select: {
                                followingId: true,
                            }
                        },
                    }
                })

                if (!user) {
                    return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
                }

                const totalArticles = await this.prisma.article.count({
                    where: {
                        authorId: user.id
                    }
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    data: user,
                    hasFollowed: user.following.length > 0,
                    totalArticles,
                })
            } else {
                const user = await this.prisma.user.findUnique({
                    where: { username },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        fullname: true,
                        verification: {
                            select: {
                                verified: true,
                                email_verified: true,
                            }
                        },
                        profile: {
                            select: {
                                bio: true,
                                avatar: true,
                            }
                        },
                    }
                })

                if (!user) {
                    return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
                }

                const totalArticles = await this.prisma.article.count({
                    where: {
                        authorId: user.id
                    }
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    data: user,
                    totalArticles,
                })
            }
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error fetching profile')
        }
    }

    async fetchArticles(
        res: Response,
        username: string,
        { page = 1, limit = 4 }: ArticlesDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit
            const currentDate = new Date()

            const user = await this.prisma.user.findUnique({
                where: { username }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            const nonBoostedArticles = await this.prisma.article.findMany({
                where: {
                    authorId: user.id,
                    boosting: null,
                },
                select: {
                    id: true,
                    title: true,
                    views: true,
                    categories: true,
                    coverPhoto: true,
                    readingTime: true,
                    publishedAt: true,
                    author: {
                        select: {
                            username: true,
                            fullname: true,
                            profile: {
                                select: {
                                    avatar: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    publishedAt: 'desc'
                },
                skip: offset,
                take: limit
            })

            const boostedOrArticles = await this.prisma.article.findMany({
                where: {
                    authorId: user.id,
                    boosting: {
                        boosting_expiry: {
                            gte: currentDate
                        }
                    }
                },
                select: {
                    id: true,
                    title: true,
                    views: true,
                    categories: true,
                    coverPhoto: true,
                    readingTime: true,
                    publishedAt: true,
                    author: {
                        select: {
                            username: true,
                            fullname: true,
                            profile: {
                                select: {
                                    avatar: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    boosting: {
                        boosting_point: 'desc'
                    }
                },
                skip: offset,
                take: limit
            })

            let allArticles = [...boostedOrArticles, ...nonBoostedArticles]

            const uniqueIds = new Set()
            allArticles = allArticles.filter(article => {
                if (uniqueIds.has(article.id)) {
                    return false
                } else {
                    uniqueIds.add(article.id)
                    return true
                }
            })

            allArticles.forEach(article => {
                article.title = article.title.length > 50 ? article.title.substring(0, 50) + '...' : article.title
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: allArticles })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error fetching articles')
        }
    }

    async fetchBookmarks(
        res: Response,
        { sub }: ExpressUser,
    ) {
        try {
            const bookmarks = await this.prisma.bookmark.findMany({
                where: {
                    userId: sub
                },
                select: {
                    bookmarkedAt: true,
                    article: {
                        select: {
                            id: true,
                            title: true,
                            views: true,
                            categories: true,
                            coverPhoto: true,
                            readingTime: true,
                            publishedAt: true,
                            author: {
                                select: {
                                    username: true,
                                    fullname: true,
                                    profile: {
                                        select: {
                                            avatar: true,
                                        }
                                    }
                                }
                            }
                        },
                    }
                },
                orderBy: {
                    bookmarkedAt: 'desc'
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: bookmarks })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error fetching bookmarked articles')
        }
    }

    async fetchNotifications(res: Response, { sub }: ExpressUser) {
        try {
            const currentDate = new Date()
            const thirtyDaysAgo = new Date(currentDate)
            thirtyDaysAgo.setDate(currentDate.getDate() - 30)

            const notifications = await this.prisma.notification.findMany({
                where: {
                    userId: sub,
                    notifiedAt: {
                        gte: thirtyDaysAgo,
                        lte: currentDate,
                    }
                },
                select: {
                    id: true,
                    title: true,
                    notifiedAt: true,
                    description: true,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: notifications })

            res.on('finish', async () => {
                const allUnreadNotifications = await this.prisma.notification.count({
                    where: {
                        userId: sub,
                        read: false,
                    }
                })

                if (allUnreadNotifications > 0) {
                    await this.markNotificationsAsRead(sub)
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error fetching Notifications")
        }
    }

    private async markNotificationsAsRead(userId: string) {
        try {
            await this.prisma.notification.updateMany({
                where: {
                    userId,
                    read: false,
                },
                data: {
                    read: true,
                },
            })
        } catch (err) {
            console.error(err)
        }
    }


    async globalSearch(
        res: Response,
        { q, type }: GlobalSearchDto
    ) {
        try {
            let query: any

            if (type === 'people') {
                query = await this.prisma.user.findMany({
                    where: {
                        OR: [
                            { username: { contains: q, mode: 'insensitive' } },
                            { fullname: { contains: q, mode: 'insensitive' } },
                        ]
                    },
                    select: {
                        id: true,
                        username: true,
                        fullname: true,
                        profile: {
                            select: {
                                bio: true,
                                avatar: true,
                            }
                        }
                    }
                })
            } else if (type === 'jobs') {
                query = await this.prisma.job.findMany({
                    where: {
                        OR: [
                            { name: { contains: q, mode: 'insensitive' } },
                            { description: { contains: q, mode: 'insensitive' } },
                        ]
                    }
                })
            } else if (type === 'forums') {
                query = await this.prisma.forum.findMany({
                    where: {
                        OR: [
                            { title: { contains: q, mode: 'insensitive' } },
                            { description: { contains: q, mode: 'insensitive' } },
                            { keywordsText: { contains: q, mode: 'insensitive' } },
                        ]
                    }
                })
            } else {
                query = await this.prisma.article.findMany({
                    where: {
                        pending_approval: false,
                        OR: [
                            { title: { contains: q, mode: 'insensitive' } },
                            { boosting: { boosting_expiry: { gte: new Date() } } },
                            { categoriesText: { contains: q, mode: 'insensitive' } },
                        ],
                    },
                    select: {
                        id: true,
                        title: true,
                        views: true,
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
                        boosting: {
                            select: {
                                boosting_point: true
                            }
                        }
                    },
                    orderBy: [
                        { publishedAt: 'desc' },
                        { boosting: { boosting_point: 'desc' } }
                    ]
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: query })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchForums(
        req: Request,
        res: Response,
        username: string,
        { q = '' }: SearchDto,
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { username }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            // @ts-ignore
            const sub = req.user?.sub

            if (sub && user.id === sub) {
                let forums = await this.prisma.forum.findMany({
                    where: {
                        participants: {
                            some: {
                                userId: user.id
                            }
                        },
                        OR: [
                            { title: { contains: q, mode: 'insensitive' } },
                            { description: { contains: q, mode: 'insensitive' } },
                            { keywordsText: { contains: q, mode: 'insensitive' } },
                            { messages: { some: { content: { contains: q, mode: 'insensitive' } } } }
                        ],
                    },
                    include: {
                        messages: true,
                        participants: true,
                        forumReadStatus: {
                            where: { userId: user.id },
                            select: { lastReadMessageId: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                })

                forums = await Promise.all(forums.map(async forum => {
                    const userForumReadStatus = forum.forumReadStatus[0]
                    const unreadCount = await this.calculateUnreadMessagesCount(forum.id, userForumReadStatus?.lastReadMessageId)

                    return { ...forum, unreadCount }
                }))

                // @ts-ignore
                forums.sort((a, b) => b.unreadCount - a.unreadCount)

                const forumWithoutMessages = forums.map(forum => {
                    return {
                        id: forum.id,
                        title: forum.title,
                        keywords: forum.keywords,
                        createdAt: forum.createdAt,
                        description: forum.description,
                        profile_img: forum.profile_img,
                        // @ts-ignore
                        unreadCount: forum.unreadCount,
                    }
                })

                this.response.sendSuccess(res, StatusCodes.OK, { data: forumWithoutMessages })
            } else {
                const forums = await this.prisma.forum.findMany({
                    where: {
                        participants: {
                            some: {
                                userId: user.id
                            }
                        },
                        OR: [
                            { title: { contains: q, mode: 'insensitive' } },
                            { description: { contains: q, mode: 'insensitive' } },
                            { keywordsText: { contains: q, mode: 'insensitive' } },
                            { messages: { some: { content: { contains: q, mode: 'insensitive' } } } }
                        ],
                    },
                    orderBy: { createdAt: 'desc' }
                })

                this.response.sendSuccess(res, StatusCodes.OK, { data: forums })
            }
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }


    private async calculateUnreadMessagesCount(forumId: string, lastReadMessageId: string | null): Promise<number> {
        try {
            if (!lastReadMessageId) {
                const totalMessagesCount = await this.prisma.forumMessage.count({
                    where: { forumId: forumId }
                })
                return totalMessagesCount
            } else {
                const unreadMessagesCount = await this.prisma.forumMessage.count({
                    where: {
                        forumId: forumId,
                        id: { gt: lastReadMessageId }
                    }
                })
                return unreadMessagesCount
            }
        } catch (err) {
            throw new Error(`Error calculating unread messages`)
        }
    }

    async bankAccountVerification(res: Response, { account_number, bank_code }: ValidateBankDto) {
        const { data } = await this.paystack.resolveAccount(account_number, bank_code)

        this.response.sendSuccess(res, StatusCodes.OK, { data })
    }

    async fetchBanks(res: Response) {
        const { data: banks } = await this.paystack.listBanks()

        this.response.sendSuccess(res, StatusCodes.OK, { data: banks })
    }

    async fetchBankByBankCode(res: Response, bankCode: string) {
        const bank = await this.paystack.getBankByBankCode(bankCode)

        if (!bank) {
            this.response.sendError(res, StatusCodes.NotFound, "No supported Bank Name is associated with this bank code.")
            return
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: bank })
    }

    async fetchAccountDetail(res: Response, { sub }: ExpressUser) {
        const profile = await this.prisma.profile.findUnique({
            where: { userId: sub },
            include: { accountDetail: true }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: profile?.accountDetail })
    }
}