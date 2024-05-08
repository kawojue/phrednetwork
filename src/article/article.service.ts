import { Advert } from '@prisma/client'
import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { Injectable } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { PublishArticleDto } from './dto/publish-article.dto'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary'

@Injectable()
export class ArticleService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    async publishArticle(
        res: Response,
        { sub, role }: ExpressUser,
        header: FileDest, file: Express.Multer.File,
        { content, category, title }: PublishArticleDto,
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Cover photo is required')
            }

            const MAX_SIZE = 10 << 20
            const allowedExt: string[] = ['jpg', 'png']
            const ext = file.originalname.split('.').pop()

            if (file.size > MAX_SIZE) {
                return this.response.sendError(res, StatusCodes.PayloadTooLarge, 'File too large')
            }

            if (!allowedExt.includes(ext)) {
                return this.response.sendError(res, StatusCodes.UnsupportedContent, "File extension is not allowed")
            }

            if (role === "user") {
                const user = await this.prisma.user.findUnique({
                    where: {
                        id: sub
                    }
                })

                if (!user) {
                    return this.response.sendError(res, StatusCodes.NotFound, "Account not found")
                }

                const verification = await this.prisma.verification.findUnique({
                    where: {
                        userId: sub
                    }
                })

                if (!verification.verified) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, 'Submit your license before publishing an article')
                }

                const isMemebershipNotActive = await this.prisma.isMembershipExpired(sub)
                if (isMemebershipNotActive) {
                    const isNotAbleToPost = await this.prisma.hasPublishedTwiceToday(sub)

                    if (isNotAbleToPost) {
                        return this.response.sendError(res, StatusCodes.Forbidden, 'Become a member to publish more than two articles per day')
                    }
                }

                const categ = JSON.parse(category.replace(/'/g, '"')) as Array<string>
                const clientCategories = categ.map(cat => cat.toLowerCase())
                const dbCategories = (await this.prisma.categories.findMany()).map(cat => cat.text.toLowerCase())
                const isValidCategories = clientCategories.every(clientCat => dbCategories.includes(clientCat))

                if (!isValidCategories) {
                    return this.response.sendError(res, StatusCodes.OK, 'Invalid article category')
                }

                let uploadRes: UploadApiResponse | UploadApiErrorResponse
                try {
                    uploadRes = await this.cloudinary.upload(file, header)
                } catch (err) {
                    throw err
                }

                const article = await this.prisma.article.create({
                    data: {
                        title,
                        content,
                        categoriesText: categ.join(', '),
                        readingTime: await this.misc.calculateReadingTime(content),
                        coverPhoto: {
                            public_url: uploadRes.url,
                            public_id: uploadRes.public_id,
                            secure_url: uploadRes.secure_url,
                        },
                        categories: categ,
                        author: {
                            connect: {
                                id: sub
                            }
                        }
                    }
                })

                this.response.sendSuccess(res, StatusCodes.Created, {
                    message: "Your article has been published",
                    data: article
                })
            } else if (role === "admin" || role === "auditor") {
                const adminitor = await this.prisma.adminitor.findUnique({
                    where: {
                        id: sub
                    }
                })

                if (!adminitor) {
                    return this.response.sendError(res, StatusCodes.NotFound, "Account not found")
                }

                const categ = JSON.parse(category.replace(/'/g, '"')) as Array<string>

                let uploadRes: UploadApiResponse | UploadApiErrorResponse
                try {
                    uploadRes = await this.cloudinary.upload(file, header)
                } catch (err) {
                    throw err
                }

                const article = await this.prisma.article.create({
                    data: {
                        title,
                        content,
                        categories: categ,
                        pending_approval: false,
                        categoriesText: categ.join(', '),
                        readingTime: await this.misc.calculateReadingTime(content),
                        coverPhoto: {
                            public_url: uploadRes.url,
                            public_id: uploadRes.public_id,
                            secure_url: uploadRes.secure_url,
                        },
                        adminitor: {
                            connect: {
                                id: sub
                            }
                        }
                    }
                })

                const currentDate = new Date()
                const sevenDays = new Date(currentDate)
                sevenDays.setDate(currentDate.getDate() + 7)

                await this.prisma.boosting.create({
                    data: {
                        boostedAt: new Date(),
                        boosting_expiry: sevenDays,
                        boosting_point: 10,
                        article: {
                            connect: {
                                id: article.id
                            }
                        }
                    }
                })

                this.response.sendSuccess(res, StatusCodes.Created, {
                    message: "Your article has been published",
                    data: article
                })
            } else {
                throw new Error("Invalid role")
            }
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async removeArticle(
        res: Response,
        articleId: string,
        { sub }: ExpressUser
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId,
                    authorId: sub
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

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Article has been removed successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error removing article")
        }
    }

    async fetchArticle(
        req: Request,
        res: Response,
        articleId: string,
    ) {
        // @ts-ignore
        const sub = req.user?.sub
        // @ts-ignore
        const auth = req.user?.auth
        // @ts-ignore
        const role = req.user?.role
        // @ts-ignore
        const membership = req.user?.membership

        const totalLikes = await this.prisma.like.count({ where: { articleId } })
        const totalBookmarks = await this.prisma.bookmark.count({ where: { articleId } })

        try {
            if (auth === false || membership === false) {
                const article = await this.prisma.article.findUnique({
                    where: {
                        id: articleId
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
                        adminitor: {
                            select: {
                                id: true,
                                avatar: true,
                                fullname: true,
                            }
                        }
                    }
                })

                const advert = await this.misc.getAdvert(article.id)

                this.response.sendSuccess(res, StatusCodes.OK, {
                    auth,
                    membership,
                    advert,
                    totalLikes,
                    data: article,
                    totalBookmarks,
                    hasBoosted: null,
                })
            } else {
                if (sub) {
                    const article = await this.prisma.article.findUnique({
                        where: {
                            id: articleId
                        },
                        include: {
                            boosting: true,
                            likes: {
                                where: { userId: sub },
                                select: { userId: true }
                            },
                            bookmarks: {
                                where: { userId: sub },
                                select: { userId: true }
                            },
                            author: {
                                select: {
                                    id: true,
                                    username: true,
                                    fullname: true,
                                    profile: {
                                        select: {
                                            avatar: true,
                                        }
                                    }
                                },
                            }
                        }
                    })

                    const hasLiked = article.likes.length > 0
                    const hasBoosted = article.boosting !== null
                    const hasBookmarked = article.bookmarks.length > 0

                    let advert: Advert | null = null

                    // @ts-ignore
                    if (req.user?.role !== 'admin' && req.user?.role !== 'auditor' && sub !== article.authorId) {
                        advert = await this.misc.getAdvert(article.id)
                    }

                    this.response.sendSuccess(res, StatusCodes.OK, {
                        auth,
                        advert,
                        hasLiked,
                        membership,
                        totalLikes,
                        hasBookmarked,
                        data: article,
                        totalBookmarks,
                        hasBoosted: sub === article.authorId ? hasBoosted : null
                    })
                } else {
                    const article = await this.prisma.article.findUnique({
                        where: {
                            id: articleId
                        },
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
                            }
                        }
                    })

                    const advert = await this.misc.getAdvert(article.id)

                    this.response.sendSuccess(res, StatusCodes.OK, {
                        auth,
                        membership,
                        advert,
                        totalLikes,
                        data: article,
                        totalBookmarks,
                        hasBoosted: null,
                    })
                }
            }
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleLikeOnArticle(
        res: Response,
        articleId: string,
        { sub }: ExpressUser,
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId
                },
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const existingLike = await this.prisma.like.findUnique({
                where: {
                    userId_articleId: {
                        articleId,
                        userId: sub,
                    },
                },
            })

            if (existingLike) {
                await this.prisma.like.delete({
                    where: {
                        id: existingLike.id,
                    },
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    message: 'Like removed successfully',
                    hasLiked: false,
                })
            } else {
                await this.prisma.like.create({
                    data: {
                        user: {
                            connect: { id: sub },
                        },
                        article: {
                            connect: { id: articleId }
                        }
                    },
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    message: 'Article liked successfully',
                    hasLiked: true,
                })
            }
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error toggling like on article')
        }
    }

    async toggleBookmarkOnArticle(
        res: Response,
        articleId: string,
        { sub }: ExpressUser
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId
                },
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const existingBookmark = await this.prisma.bookmark.findUnique({
                where: {
                    userId_articleId: {
                        articleId,
                        userId: sub,
                    },
                },
            })

            if (existingBookmark) {
                await this.prisma.bookmark.delete({
                    where: {
                        id: existingBookmark.id,
                    },
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    message: 'Article has been removed from the list of bookmarked articles',
                    hasBookmarked: false,
                })
            } else {
                const totalBookmarks = await this.prisma.bookmark.count({
                    where: {
                        articleId,
                        userId: sub,
                    }
                })

                if (totalBookmarks === 5) {
                    return this.response.sendError(res, StatusCodes.BadRequest, 'Only a maximum of five bookmarks is allowed')
                }

                await this.prisma.bookmark.create({
                    data: {
                        user: {
                            connect: { id: sub },
                        },
                        article: {
                            connect: { id: articleId }
                        }
                    },
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    message: 'Article has been bookmarked',
                    hasBookmarked: true,
                })
            }
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error bookmarking an article')
        }
    }
}