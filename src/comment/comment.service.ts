import { ReplyDto } from './dto/reply.dto'
import { Request, Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { CommentDto, FetchCommentsDto } from './dto/comment.dto'

@Injectable()
export class CommentService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
    ) { }

    async addCommentOnArticle(
        res: Response,
        articleId: string,
        { sub }: ExpressUser,
        { content }: CommentDto,
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: { id: articleId }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const comment = await this.prisma.comment.create({
                data: {
                    content,
                    article: {
                        connect: {
                            id: articleId
                        }
                    },
                    user: {
                        connect: {
                            id: sub
                        }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.Created, { data: comment })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async removeCommentOnArticle(
        res: Response,
        articleId: string,
        commentId: string,
        { sub, role }: ExpressUser
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId
                }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const comment = await this.prisma.comment.findUnique({
                where: {
                    articleId,
                    id: commentId,
                },
                include: {
                    replies: true
                }
            })

            if (!comment) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Comment not found')
            }

            if (sub === comment.userId || role === 'admin') {
                if (comment.replies.length > 0) {
                    await this.prisma.reply.deleteMany({
                        where: {
                            commentId: comment.id
                        }
                    })
                }

                await this.prisma.comment.delete({
                    where: {
                        articleId,
                        id: commentId,
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: "Comment has been removed"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error deleting a comment')
        }
    }

    async fetchComments(
        req: Request,
        res: Response,
        articleId: string,
        { page = 1, limit = 15 }: FetchCommentsDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)

            // @ts-ignore
            const sub = req.user?.sub
            const offset = (page - 1) * limit

            const comments = await this.prisma.comment.findMany({
                where: { articleId },
                take: limit,
                skip: offset,
                include: {
                    likes: true,
                    replies: true,
                    user: {
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
                },
                orderBy: {
                    commentedAt: 'desc',
                }
            })

            const commentsWithLikesAndReplies = comments.map(comment => ({
                ...comment,
                totalLikes: comment.likes.length,
                hasLiked: sub ? comment.likes.some(like => like.userId === sub) : null
            }))

            const length = await this.prisma.comment.count({
                where: { articleId }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: commentsWithLikesAndReplies,
                fetchLength: commentsWithLikesAndReplies.length,
                totalComments: length
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleLikeOnComment(
        res: Response,
        articleId: string,
        commentId: string,
        { sub }: ExpressUser
    ) {
        try {
            const comment = await this.prisma.comment.findUnique({
                where: { id: commentId },
            })

            if (!comment) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Comment not found')
            }

            const existingLike = await this.prisma.like.findUnique({
                where: {
                    userId_articleId: {
                        articleId,
                        userId: sub,
                    },
                    commentId,
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
                        },
                        comment: {
                            connect: { id: commentId },
                        },
                    },
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    message: 'Comment liked successfully',
                    hasLiked: true,
                })
            }
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error toggling like on comment')
        }
    }

    async addReply(
        res: Response,
        articleId: string,
        commentId: string,
        { sub }: ExpressUser,
        { content }: ReplyDto,
    ) {
        try {
            const comment = await this.prisma.comment.findUnique({
                where: {
                    articleId,
                    id: commentId
                }
            })

            if (!comment) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Comment not found')
            }

            const reply = await this.prisma.reply.create({
                data: { content, comment: { connect: { id: comment.id } }, user: { connect: { id: sub } } }
            })

            this.response.sendSuccess(res, StatusCodes.Created, {
                data: reply,
                message: 'Reply has been sent',
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error adding reply')
        }
    }

    async removeReply(
        res: Response,
        replyId: string,
        articleId: string,
        commentId: string,
        { sub, role }: ExpressUser
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId
                }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const comment = await this.prisma.comment.findUnique({
                where: {
                    articleId,
                    id: commentId,
                }
            })

            if (!comment) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Comment not found')
            }

            if (article.authorId === sub) {
                return this.response.sendError(res, StatusCodes.Unauthorized, 'You cannot delete a reply')
            }

            const reply = await this.prisma.reply.findUnique({
                where: {
                    id: replyId,
                    commentId: comment.id
                }
            })

            if (!reply) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Reply not found')
            }

            if (sub === comment.userId || role === 'admin') {
                await this.prisma.reply.delete({
                    where: {
                        id: replyId,
                        commentId: comment.id
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: "Reply has been removed"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error removing reply')
        }
    }

    async fetchReplies(
        res: Response,
        articleId: string,
        commentId: string,
        { page = 1, limit = 15 }: FetchCommentsDto
    ) {
        try {
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            const article = await this.prisma.article.findUnique({
                where: { id: articleId },
            })

            const comment = await this.prisma.comment.findUnique({
                where: { id: commentId }
            })

            if (!article || !comment) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Referecnce not found')
            }

            const replies = await this.prisma.reply.findMany({
                where: { commentId },
                skip: offset,
                take: limit,
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: replies })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error fetching replies")
        }
    }
}
