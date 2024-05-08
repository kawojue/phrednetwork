import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { UserStatus } from '@prisma/client'
import { genToken } from 'helpers/genToken'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { PlunkService } from 'lib/plunk.service'
import { DisapproveDto } from './dto/article.dto'
import { PrismaService } from 'lib/prisma.service'
import { AnalyticsDto } from './dto/analytics.dto'
import { genRandomCode } from 'helpers/genRandStr'
import { Encryption } from 'lib/encryption.service'
import { UpdatePasswordDto } from 'src/auth/dto/password.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary'
import { AdminitorRole, Article, DonationAndAdverts } from 'enums/base'
import { LicenseSubmissionDto, UserSuspensionDto } from './dto/user.dto'
import { SigninDto, SignupDto, UpdateAdminitorProfile } from './dto/auth.dto'
import { editAdminitorDto, InviteAdminitorDto } from './dto/invite-adminitordto'
import { AllAdvertsDto, AllArticlesDto, AllForumsDto, AllUsersDto } from './dto/infite-scroll.dto'

@Injectable()
export class AdminitorService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly encryption: Encryption,
        private readonly paystack: PaystackService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    async signup(
        res: Response,
        {
            role, fullname,
            email, password
        }: SignupDto
    ) {
        try {
            fullname = titleName(fullname)
            email = email.toLowerCase().trim()

            const adminitor = await this.prisma.adminitor.findUnique({
                where: { email }
            })

            if (adminitor) {
                return this.response.sendError(res, StatusCodes.Conflict, `Already an ${adminitor.role}`)
            }

            password = await this.encryption.hashAsync(password, 12)

            await this.prisma.adminitor.create({
                data: { role, email, fullname, password }
            })

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: 'Successfully created'
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async signin(
        res: Response,
        { email, password }: SigninDto
    ) {
        try {
            email = email.toLowerCase().trim()
            const adminitor = await this.prisma.adminitor.findUnique({
                where: { email }
            })

            if (!adminitor) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Invalid email or password')
            }

            const isMatch = await this.encryption.compareAsync(password, adminitor.password)

            if (!isMatch) {
                return this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect password')
            }

            const accessToken = await this.misc.generateAccessToken({
                sub: adminitor.id,
                role: adminitor.role,
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: 'Login Successful',
                access_token: accessToken,
                data: {
                    role: adminitor.role,
                    email: adminitor.email,
                    avatar: adminitor.avatar,
                    fullname: adminitor.fullname,
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async resetPassword(
        res: Response,
        email: string
    ) {
        try {
            const adminitor = await this.prisma.adminitor.findUnique({
                where: { email }
            })

            if (!adminitor) {
                return this.response.sendError(res, StatusCodes.NotFound, 'There is no Admin or Auditor associated with this email')
            }

            let { token: password } = genToken(adminitor.id, genRandomCode())
            password = password.slice(0, 23)

            await this.plunk.sendPlunkEmail({
                to: email,
                subject: `${adminitor.role.toUpperCase()} - New Password`,
                body: `Your new password - ${password}`
            })

            const hashedPassword = await this.encryption.hashAsync(password, 12)
            await this.prisma.adminitor.update({
                where: { email },
                data: {
                    password: hashedPassword
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "A new password has been sent to your email "
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async updatePassword(
        res: Response,
        { sub }: ExpressUser,
        { oldPassword, password1, password2 }: UpdatePasswordDto
    ) {
        try {
            if (password1 !== password2) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Passwords do not match")
            }

            const adminitor = await this.prisma.user.findUnique({
                where: {
                    id: sub,
                }
            })

            const isMatch = await this.encryption.compareAsync(oldPassword, adminitor.password)
            if (!isMatch) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Incorrect password")
            }

            const password = await this.encryption.hashAsync(password1)
            await this.prisma.adminitor.update({
                where: {
                    id: sub
                },
                data: { password }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Password has been updated successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async updateAdminitorProfile(
        res: Response,
        { sub }: ExpressUser,
        file: Express.Multer.File, header: FileDest,
        { fullname, email }: UpdateAdminitorProfile,
    ) {
        try {
            const adminitor = await this.prisma.adminitor.findUnique({
                where: {
                    id: sub
                }
            })

            if (fullname?.trim()) {
                fullname = titleName(fullname)
            } else {
                fullname = adminitor.fullname
            }

            if (email?.trim()) {
                email = email.trim().toLowerCase()
            }

            if (email && adminitor.email !== email) {
                const findByEmail = await this.prisma.user.findUnique({
                    where: { email }
                })

                if (findByEmail) {
                    return this.response.sendError(res, StatusCodes.Conflict, 'Email already exists')
                }
            } else {
                email = adminitor.email
            }

            let uploadRes: UploadApiResponse | UploadApiErrorResponse
            if (file) {
                const MAX_SIZE = 4 << 20
                const allowedExt: string[] = ['jpg', 'png']
                const ext = file.originalname.split('.').pop()

                if (file.size > MAX_SIZE) {
                    return this.response.sendError(res, StatusCodes.PayloadTooLarge, 'File too large')
                }

                if (!allowedExt.includes(ext)) {
                    return this.response.sendError(res, StatusCodes.UnsupportedContent, "File extension is not allowed")
                }

                if (adminitor?.avatar?.public_id) {
                    await this.cloudinary.delete(adminitor.avatar.public_id)
                }

                uploadRes = await this.cloudinary.upload(file, header)
            }

            const updatedAdminitor = await this.prisma.adminitor.update({
                where: {
                    id: sub
                },
                data: {
                    avatar: {
                        public_url: uploadRes?.url ?? '',
                        public_id: uploadRes?.public_id ?? '',
                        secure_url: uploadRes?.secure_url ?? '',
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    email: updatedAdminitor.email,
                    fullname: updatedAdminitor.fullname,
                    avatar: updatedAdminitor?.avatar?.public_url
                },
                message: "Profile has been updated successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, err.message)
        }
    }

    async fetchAnalytics(
        res: Response,
        {
            donations, users,
            adverts, articles,
        }: AnalyticsDto,
    ) {
        try {
            let articleCounts: number
            if (articles === Article.active || articles === Article.pending) {
                articleCounts = await this.prisma.article.count({
                    where: {
                        pending_approval: articles === Article.active ? false : true
                    }
                })
            } else {
                articleCounts = await this.prisma.article.count()
            }

            let userCounts: number
            if (users === UserStatus.Active || users === UserStatus.Suspended) {
                userCounts = await this.prisma.user.count({
                    where: {
                        userStatus: users === UserStatus.Active ? 'Active' : 'Suspended'
                    }
                })
            } else {
                userCounts = await this.prisma.user.count()
            }

            let advertCounts: number
            const currentDate = new Date()
            if (adverts === DonationAndAdverts.expired || adverts === DonationAndAdverts.active) {
                advertCounts = await this.prisma.advert.count({
                    where: {
                        advert_expiry: {
                            [adverts === DonationAndAdverts.expired ? 'lt' : 'gt']: currentDate
                        }
                    }
                })
            } else {
                advertCounts = 0
            }

            let donateCounts: number
            const allDonations = await this.prisma.membership.findMany()
            if (donations === DonationAndAdverts.active || donations === DonationAndAdverts.expired) {
                const memberships = await Promise.all(allDonations.map(donation => this.prisma.isMembershipExpired(donation.userId)))
                if (donations === DonationAndAdverts.active) {
                    donateCounts = memberships.filter(expired => !expired).length
                } else {
                    donateCounts = memberships.filter(expired => expired).length
                }
            } else {
                donateCounts = 0
            }

            this.response.sendSuccess(res, StatusCodes.OK, { donateCounts, articleCounts, userCounts, advertCounts })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchAllUsers(
        res: Response,
        {
            pending_verification = null, withdrawal_request = null,
            search = '', endDate = '', startDate = '', page = 1, limit = 30,
        }: AllUsersDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            let users

            if (pending_verification === 'true') {
                users = await this.prisma.user.findMany({
                    where: {
                        AND: [
                            {
                                verification: {
                                    status: 'In Progress'
                                }
                            },
                            {
                                createdAt: {
                                    gte: startDate !== '' ? new Date(startDate) : new Date(0),
                                    lte: endDate !== '' ? new Date(endDate) : new Date(),
                                },
                            },
                            {
                                OR: [
                                    { email: { contains: search, mode: 'insensitive' } },
                                    { username: { contains: search, mode: 'insensitive' } },
                                    { fullname: { contains: search, mode: 'insensitive' } },
                                ],
                            },
                        ],
                    },
                    take: limit,
                    skip: offset,
                    orderBy: {
                        verification: {
                            submittedAt: 'desc'
                        }
                    },
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                avatar: true,
                            }
                        },
                        fullname: true,
                        username: true,
                        createdAt: true,
                        userStatus: true,
                        verification: {
                            select: {
                                status: true,
                                submittedAt: true,
                            }
                        },
                        wallet: {
                            select: {
                                lastRequestedAt: true,
                                amountToWithdraw: true,
                                requestingWithdrawal: true,
                            }
                        }
                    }
                })
            } else if (withdrawal_request === 'true') {
                users = await this.prisma.user.findMany({
                    where: {
                        AND: [
                            {
                                wallet: {
                                    requestingWithdrawal: true
                                }
                            },
                            {
                                createdAt: {
                                    gte: startDate !== '' ? new Date(startDate) : new Date(0),
                                    lte: endDate !== '' ? new Date(endDate) : new Date(),
                                },
                            },
                            {
                                OR: [
                                    { email: { contains: search, mode: 'insensitive' } },
                                    { username: { contains: search, mode: 'insensitive' } },
                                    { fullname: { contains: search, mode: 'insensitive' } },
                                ],
                            },
                        ],
                    },
                    take: limit,
                    skip: offset,
                    orderBy: {
                        wallet: {
                            lastRequestedAt: 'desc'
                        }
                    },
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                avatar: true,
                            }
                        },
                        fullname: true,
                        username: true,
                        createdAt: true,
                        userStatus: true,
                        verification: {
                            select: {
                                status: true,
                            }
                        },
                        wallet: {
                            select: {
                                lastRequestedAt: true,
                                amountToWithdraw: true,
                                requestingWithdrawal: true,
                            }
                        }
                    }
                })
            } else {
                users = await this.prisma.user.findMany({
                    where: {
                        AND: [
                            {
                                createdAt: {
                                    gte: startDate !== '' ? new Date(startDate) : new Date(0),
                                    lte: endDate !== '' ? new Date(endDate) : new Date(),
                                },
                            },
                            {
                                OR: [
                                    { email: { contains: search, mode: 'insensitive' } },
                                    { username: { contains: search, mode: 'insensitive' } },
                                    { fullname: { contains: search, mode: 'insensitive' } },
                                ],
                            },
                        ],
                    },
                    take: limit,
                    skip: offset,
                    orderBy: {
                        createdAt: 'desc'
                    },
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                avatar: true,
                            }
                        },
                        fullname: true,
                        username: true,
                        createdAt: true,
                        userStatus: true,
                        verification: {
                            select: {
                                status: true,
                            }
                        },
                        wallet: {
                            select: {
                                lastRequestedAt: true,
                                amountToWithdraw: true,
                                requestingWithdrawal: true,
                            }
                        }
                    }
                })
            }

            const usersWithMembershipStatus = await Promise.all(users.map(async (user) => {
                return { ...user, accountType: await this.prisma.isMembershipExpired(user.id) ? 'Basic User' : 'Premium User' }
            }))

            this.response.sendSuccess(res, StatusCodes.OK, { data: usersWithMembershipStatus })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async approveArticle(
        res: Response,
        articleId: string
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId,
                    pending_approval: true,
                }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found or either not pending approval')
            }

            const approvedArticle = await this.prisma.article.update({
                where: {
                    id: articleId
                },
                data: {
                    approvedAt: new Date(),
                    pending_approval: false
                }
            })

            await this.prisma.notification.create({
                data: {
                    title: 'Article - APPROVED',
                    description: 'Your article has been approved is now live',
                    user: {
                        connect: { id: article.authorId }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: approvedArticle,
                message: 'Article has been approved'
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async disapproveOrRemoveArticle(
        res: Response,
        articleId: string,
        { reason }: DisapproveDto
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId,
                },
                include: { boosting: true }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const cover_photo = article.coverPhoto
            if (cover_photo?.public_id) {
                await this.cloudinary.delete(cover_photo.public_id)
            }

            const comments = await this.prisma.comment.findMany({
                where: { articleId },
                include: {
                    likes: true,
                    replies: true,
                }
            })

            for (const comment of comments) {
                if (comment.likes.length > 0) {
                    await this.prisma.like.deleteMany({
                        where: {
                            commentId: comment.id
                        }
                    })
                }
                if (comment.replies.length > 0) {
                    await this.prisma.reply.deleteMany({
                        where: {
                            commentId: comment.id
                        }
                    })
                }
            }

            if (article.boosting) {
                await this.prisma.boosting.delete({
                    where: { articleId }
                })
            }

            await this.prisma.$transaction([
                this.prisma.comment.deleteMany({
                    where: { articleId }
                }),
                this.prisma.like.deleteMany({
                    where: { articleId }
                }),
                this.prisma.bookmark.deleteMany({
                    where: { articleId }
                }),
                this.prisma.article.delete({
                    where: {
                        id: articleId
                    }
                }),
            ])

            if (reason) {
                await this.prisma.notification.create({
                    data: {
                        title: 'Article - DISAPPROVED',
                        description: `Your article was disapproved`,
                        user: {
                            connect: {
                                id: article.authorId
                            }
                        }
                    }
                })

                await this.plunk.sendPlunkEmail({
                    to: article.authorId,
                    subject: 'Article - DISAPPROVED',
                    body: `${reason}`,
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: `Article has been removed sucessfully`
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchAllArticles(
        res: Response,
        {
            search = '', endDate = '', startDate = '',
            page = 1, limit = 30, pending_approval = null,
        }: AllArticlesDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const articles = await this.prisma.article.findMany({
                where: {
                    AND: [
                        {
                            publishedAt: {
                                gte: startDate !== '' ? new Date(startDate) : new Date(0),
                                lte: endDate !== '' ? new Date(endDate) : new Date(),
                            },
                        },
                        {
                            OR: [
                                { title: { contains: search, mode: 'insensitive' } },
                                { author: { username: { contains: search, mode: 'insensitive' } } },
                                { author: { fullname: { contains: search, mode: 'insensitive' } } },
                            ],
                        },
                        pending_approval !== null ? { pending_approval: pending_approval === 'true' } : {},
                    ],
                },
                select: {
                    id: true,
                    title: true,
                    publishedAt: true,
                    pending_approval: true,
                    author: {
                        select: {
                            id: true,
                            username: true,
                            fullname: true,
                            profile: {
                                select: {
                                    avatar: true,
                                },
                            },
                        },
                    },
                    adminitor: {
                        select: {
                            id: true,
                            avatar: true,
                            fullname: true,
                        }
                    }
                },
                orderBy: [
                    { pending_approval: 'desc' },
                    { publishedAt: 'desc' }
                ],
                skip: offset,
                take: limit,
            })

            articles.forEach(article => {
                article.title = article.title.length > 50 ? article.title.substring(0, 50) + '...' : article.title
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: articles })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async inviteAdminitor(
        res: Response,
        { sub }: ExpressUser,
        { fullname, email, role }: InviteAdminitorDto
    ) {
        try {
            const adminitor = await this.prisma.adminitor.findUnique({
                where: {
                    id: sub
                }
            })

            if (role === 'admin') {
                if (!adminitor.superAdmin) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, `You don't have the right to invite a new admin`)
                }
            }

            fullname = titleName(fullname)

            const isAlreadyExists = await this.prisma.adminitor.findUnique({
                where: { email }
            })

            if (isAlreadyExists) {
                return this.response.sendError(res, StatusCodes.Conflict, `Already an ${isAlreadyExists.role}`)
            }

            let { token: newPassword } = genToken(adminitor.id, genRandomCode())
            newPassword = newPassword.slice(0, 23)

            await this.plunk.sendPlunkEmail({
                to: email,
                subject: `${role.toLowerCase()} - Invitation`,
                body: `You've been invited at Phrednetwork to be a new ${role}. This is your generated sign in password ${newPassword}`
            })

            const password = await this.encryption.hashAsync(newPassword, 12)

            await this.prisma.adminitor.create({
                data: { email, fullname, password, role }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: `Invitation has been sent to ${email}`
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async editAdminitor(
        res: Response,
        adminitorId: string,
        { sub }: ExpressUser,
        { fullname, email, role }: editAdminitorDto
    ) {
        try {
            const adminitor = await this.prisma.adminitor.findUnique({
                where: {
                    id: adminitorId
                }
            })

            if (role) {
                const isSuperAdmin = await this.prisma.adminitor.findUnique({
                    where: {
                        id: sub,
                        superAdmin: true
                    }
                })

                if (isSuperAdmin && adminitorId === sub) {
                    return this.response.sendError(res, StatusCodes.Forbidden, `You can't reassign your role`)
                }
            } else {
                role = adminitor.role as AdminitorRole
            }

            if (email) {
                const isAlreadyExists = await this.prisma.adminitor.findUnique({
                    where: { email }
                })

                if (isAlreadyExists) {
                    return this.response.sendError(res, StatusCodes.Conflict, `Already an ${isAlreadyExists.role}`)
                }
            } else {
                email = adminitor.email
            }

            if (fullname) {
                fullname = titleName(fullname)
            } else {
                fullname = adminitor.fullname
            }

            await this.prisma.adminitor.update({
                where: { id: adminitorId },
                data: { email, fullname, role }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: 'Updated successfully'
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async removeAdminitor(
        res: Response,
        adminitorId: string,
        { sub }: ExpressUser,
    ) {
        try {
            const adminitor = await this.prisma.adminitor.findUnique({
                where: {
                    id: adminitorId
                },
                include: {
                    articles: { include: { boosting: true } },
                }
            })

            if (adminitor.role === 'admin') {
                const isSuperAdmin = await this.prisma.adminitor.findUnique({
                    where: {
                        id: sub,
                        superAdmin: true
                    }
                })

                if (!isSuperAdmin) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, `You don't have the right to remove an admin`)
                }

                if (isSuperAdmin.id === adminitorId) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, `Can't remove a Super Admin`)
                }
            }

            if (adminitor.articles.length > 0) {
                const articles = adminitor.articles

                for (const article of articles) {
                    const articleId = article.id
                    const cover_photo = article.coverPhoto

                    if (cover_photo?.public_id) {
                        await this.cloudinary.delete(cover_photo.public_id)
                    }

                    const comments = await this.prisma.comment.findMany({
                        where: { articleId },
                        include: {
                            likes: true,
                            replies: true,
                        }
                    })

                    if (article.boosting) {
                        await this.prisma.boosting.delete({
                            where: { articleId }
                        })
                    }

                    for (const comment of comments) {
                        if (comment.likes.length > 0) {
                            await this.prisma.like.deleteMany({
                                where: {
                                    commentId: comment.id
                                }
                            })
                        }
                        if (comment.replies.length > 0) {
                            await this.prisma.reply.deleteMany({
                                where: {
                                    commentId: comment.id
                                }
                            })
                        }
                    }

                    await this.prisma.$transaction([
                        this.prisma.comment.deleteMany({
                            where: { articleId }
                        }),
                        this.prisma.like.deleteMany({
                            where: { articleId }
                        }),
                        this.prisma.bookmark.deleteMany({
                            where: { articleId }
                        }),
                        this.prisma.article.delete({
                            where: {
                                id: articleId
                            }
                        }),
                    ])
                }
            }

            await this.prisma.adminitor.delete({
                where: {
                    id: adminitorId
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: `${titleName(adminitor.role)} has been removed successfully`
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async getUserAndVerification(
        res: Response,
        userId: string
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                },
                select: {
                    id: true,
                    email: true,
                    profile: {
                        select: {
                            avatar: true,
                        }
                    },
                    wallet: true,
                    fullname: true,
                    username: true,
                    createdAt: true,
                    userStatus: true,
                    verification: true,
                }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            const totalArticles = await this.prisma.article.count({
                where: { authorId: userId }
            })

            const totalProducts = await this.prisma.advert.count({
                where: { postedById: userId }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { user, totalProducts, totalArticles }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleSuspendUser(
        res: Response,
        userId: string,
        { q }: UserSuspensionDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            await this.prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    userStatus: q === 'Active' ? 'Active' : 'Suspended'
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Successful" })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error toggling user's suspension")
        }
    }

    async verifyLicenseSubmission(
        res: Response,
        userId: string,
        { q, reason }: LicenseSubmissionDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            if (q === 'accept') {
                await this.prisma.$transaction([
                    this.prisma.verification.update({
                        where: { userId },
                        data: {
                            verified: true,
                            verifiedAt: new Date()
                        }
                    }),

                    this.prisma.notification.create({
                        data: {
                            title: 'Verified - SUCCESSFUL',
                            description: `You've now been verified. You can start publishing articles`,
                            user: { connect: { id: userId } }
                        }
                    })
                ])

                this.response.sendSuccess(res, StatusCodes.OK, { message: 'Successful' })
            } else {
                const [verification] = await this.prisma.$transaction([
                    this.prisma.verification.update({
                        where: { userId },
                        data: {
                            specialty: '',
                            isOwner: false,
                            verified: false,
                            durationEnd: '',
                            durationStart: '',
                            licenseNumber: '',
                            status: 'Not Verified',
                            licenseOrCertificateType: '',
                        }
                    }),

                    this.prisma.notification.create({
                        data: {
                            title: 'Verification - DECLINED',
                            description: `Your documents were rejected`,
                            user: { connect: { id: userId } }
                        }
                    })
                ])

                const attachments = verification.attachments
                if (attachments.length > 0) {
                    for (const attachment of attachments) {
                        if (attachment?.public_id) {
                            await this.cloudinary.delete(attachment.public_id)
                        }
                    }

                    await this.prisma.verification.update({
                        where: { userId },
                        data: { attachments: [] }
                    })
                }

                if (reason) {
                    await this.plunk.sendPlunkEmail({
                        to: user.email,
                        subject: `Document rejection`,
                        body: `Hello, ${user.fullname}\n${reason}`
                    })
                }

                this.response.sendSuccess(res, StatusCodes.OK, { message: "Successful" })
            }
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async listAdminitors(res: Response) {
        const adminitors = await this.prisma.adminitor.findMany({
            select: {
                id: true,
                role: true,
                email: true,
                avatar: true,
                fullname: true,
                createdAt: true,
            }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: adminitors })
    }

    async fetchAllAdverts(
        res: Response,
        {
            search = '', endDate = '', startDate = '',
            page = 1, limit = 30, pending_approval = null,
        }: AllAdvertsDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const adverts = await this.prisma.advert.findMany({
                where: {
                    AND: [
                        {
                            createdAt: {
                                gte: startDate !== '' ? new Date(startDate) : new Date(0),
                                lte: endDate !== '' ? new Date(endDate) : new Date(),
                            },
                        },
                        {
                            OR: [
                                { productName: { contains: search, mode: 'insensitive' } },
                                { keywordsText: { contains: search, mode: 'insensitive' } },
                                { postedBy: { username: { contains: search, mode: 'insensitive' } } },
                                { postedBy: { fullname: { contains: search, mode: 'insensitive' } } },
                            ],
                        },
                        pending_approval !== null ? { pending_approval: pending_approval === 'true' } : {},
                    ],
                },
                select: {
                    id: true,
                    pending_approval: true,
                    postedBy: {
                        select: {
                            username: true,
                            fullname: true,
                            profile: {
                                select: {
                                    avatar: true,
                                },
                            },
                        },
                    },
                },
                orderBy: [
                    { pending_approval: 'desc' },
                    { advert_expiry: 'asc' },
                    { createdAt: 'desc' }
                ],
                skip: offset,
                take: limit,
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: adverts })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchAllForums(
        res: Response,
        {
            endDate = '', startDate = '',
            page = 1, search = '', limit = 30,
        }: AllForumsDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const forums = await this.prisma.forum.findMany({
                where: {
                    createdAt: {
                        gte: startDate !== '' ? new Date(startDate) : new Date(0),
                        lte: endDate !== '' ? new Date(endDate) : new Date(),
                    },
                    OR: [{ title: { contains: search, mode: 'insensitive' } }]
                },
                select: {
                    id: true,
                    title: true,
                    participants: {
                        select: {
                            user: {
                                select: {
                                    username: true,
                                    fullname: true,
                                    profile: {
                                        select: {
                                            avatar: true,
                                        },
                                    },
                                }
                            }
                        },
                    },
                },
                orderBy: [
                    { createdAt: 'desc' }
                ],
                skip: offset,
                take: limit,
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: forums })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async approveOrDisApproveAdvert(
        res: Response,
        userId: string,
        advertId: string,
        { q, reason }: LicenseSubmissionDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            const advert = await this.prisma.advert.findUnique({
                where: {
                    id: advertId,
                    postedById: userId,
                    pending_approval: true,
                }
            })

            if (!advert) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Advert not found or not pending approval')
            }

            if (q === 'accept') {
                await this.prisma.$transaction([
                    this.prisma.advert.update({
                        where: {
                            id: advertId,
                            postedById: userId
                        },
                        data: { pending_approval: false }
                    }),

                    this.prisma.notification.create({
                        data: {
                            title: 'Advert - APPROVED',
                            description: `Your advert has now been approved and is live`,
                            user: { connect: { id: userId } }
                        }
                    })
                ])
            } else {
                await this.prisma.$transaction([
                    this.prisma.advert.delete({
                        where: {
                            id: advertId,
                            postedById: userId
                        },
                    }),

                    this.prisma.wallet.update({
                        where: { userId },
                        data: { balance: { increment: advert.amountPaid }, }
                    }),

                    this.prisma.notification.create({
                        data: {
                            title: 'Advert - DISAPPROVED',
                            description: `Your advert was declined and the amount has been credited to you wallet`,
                            user: { connect: { id: userId } }
                        }
                    })
                ])

                const productImage = advert.productImage
                if (productImage?.public_id) {
                    await this.cloudinary.delete(productImage.public_id)
                }

                if (reason) {
                    await this.plunk.sendPlunkEmail({
                        to: user.email,
                        subject: `Advert rejection`,
                        body: `Hello, ${user.fullname}\n${reason}`
                    })
                }
            }

            this.response.sendSuccess(res, StatusCodes.OK, { message: 'Successful' })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async approveWithdrawal(res: Response, userId: string) {
        try {
            const wallet = await this.prisma.wallet.findUnique({
                where: { userId }
            })

            if (!wallet) {
                return this.response.sendError(res, StatusCodes.NotFound, "Wallet not found")
            }

            if (wallet.requestingWithdrawal === false) {
                return this.response.sendError(res, StatusCodes.BadRequest, "User is not requesting for withdrawal")
            }

            const profile = await this.prisma.profile.findUnique({
                where: { userId },
                include: { accountDetail: true }
            })

            if (!profile.accountDetail) {
                this.response.sendError(res, StatusCodes.NotFound, 'Account details not found')
                await this.prisma.notification.create({
                    data: {
                        title: 'Account Details',
                        description: 'Add your account details to withdraw',
                        user: { connect: { id: userId } }
                    }
                })
                return
            }

            const details = profile.accountDetail
            const fee = await this.misc.calculateWithdrawalFee(wallet.amountToWithdraw)
            const amountToWithdraw = wallet.amountToWithdraw - fee.totalFee

            const { data: recepient } = await this.paystack.createRecipient({
                type: 'nuban',
                currency: 'NGN',
                name: details.accountName,
                bank_code: details.bankCode,
                account_number: details.accountNumber,
            })

            const { data: transfer } = await this.paystack.initiateTransfer({
                source: 'balance',
                amount: amountToWithdraw * 100,
                reason: `Prednetwork - withdrawal`,
                recipient: recepient.recipient_code,
                reference: `transfer-${userId}-${genRandomCode()}`
            })

            await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { userId },
                    data: {
                        amountToWithdraw: 0,
                        lastApprovedAt: new Date(),
                        requestingWithdrawal: false,
                        lastAmountSent: transfer.amount,
                        lastAmountApproved: wallet.amountToWithdraw,
                    }
                }),

                this.prisma.txHistory.create({
                    data: {
                        ...fee,
                        source: 'wallet',
                        type: 'WITHDRAWAL',
                        amount: transfer.amount / 100,
                        reference: transfer.reference,
                        status: transfer.status.toUpperCase(),
                        wallet: { connect: { id: wallet.id } }
                    }
                }),

                this.prisma.notification.create({
                    data: {
                        title: 'Withdrwal - APPROVED',
                        description: `₦${(transfer.amount / 100).toFixed(2)} has been sent to your account ('${details.accountNumber}')`,
                        user: { connect: { id: userId } }
                    }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Withdrawal has been approved" })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }
}
