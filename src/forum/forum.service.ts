import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { RequestDto } from './dto/request.dto'
import { MiscService } from 'lib/misc.service'
import { CreateForumDto } from './dto/create.dto'
import { PrismaService } from 'lib/prisma.service'
import { SendMessageDto } from './dto/send-msg.dto'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { InfiniteScrollDto } from 'src/adminitor/dto/infite-scroll.dto'

@Injectable()
export class ForumService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    async createForum(
        res: Response,
        { sub }: ExpressUser,
        file: Express.Multer.File,
        { title, maxMembers, description, keyword }: CreateForumDto
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Forum profile image is required')
            }

            const MAX_SIZE = 5 << 20
            if (file.size > MAX_SIZE) {
                return this.response.sendError(res, StatusCodes.PayloadTooLarge, 'Image too large')
            }

            if (!['jpg', 'png'].includes(file.originalname.split('.').pop())) {
                return this.response.sendError(res, StatusCodes.UnsupportedContent, "File extension is not allowed")
            }

            const uploadRes = await this.cloudinary.upload(file, {
                resource_type: 'image',
                folder: `Phrednetwork/forum/${sub}`,
            })

            const keywords = JSON.parse(keyword.replace(/'/g, '"')) as Array<string>

            const forum = await this.prisma.forum.create({
                data: {
                    keywords,
                    description,
                    ownerId: sub,
                    title: title.trim(),
                    maxMembers: Number(maxMembers),
                    profile_img: {
                        public_url: uploadRes.url,
                        public_id: uploadRes.public_id,
                        secure_url: uploadRes.secure_url,
                    },
                    keywordsText: keyword,
                    participants: {
                        connectOrCreate: {
                            where: { id: sub },
                            create: { user: { connect: { id: sub } } }
                        }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.Created, {
                data: forum,
                message: "New forum has been created by you",
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error creating forum')
        }
    }

    async sendMessage(
        res: Response,
        forumId: string,
        { sub }: ExpressUser,
        { content }: SendMessageDto
    ) {
        try {
            const isForumParticipant = await this.prisma.forum.findUnique({
                where: {
                    id: forumId,
                    participants: { some: { userId: sub } }
                }
            })

            if (!isForumParticipant) {
                return this.response.sendError(res, StatusCodes.Forbidden, 'Not a participant of this forum')
            }

            await this.prisma.forumMessage.create({
                data: {
                    content: content.trim(),
                    forum: { connect: { id: forumId } },
                    sender: { connect: { id: sub } }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: 'Message sent!'
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchForumMessages(
        res: Response,
        forumId: string,
        { sub }: ExpressUser,
        { page = 1, limit = 100, search = '' }: InfiniteScrollDto,
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const forum = await this.prisma.forum.findUnique({
                where: { id: forumId },
            })

            const userForumReadStatus = await this.prisma.userForumReadStatus.findUnique({
                where: {
                    userId_forumId: {
                        userId: sub,
                        forumId: forumId
                    }
                }
            })

            const lastReadMessageId = userForumReadStatus?.lastReadMessageId || null

            const messages = await this.prisma.forumMessage.findMany({
                where: {
                    forumId,
                    content: { contains: search, mode: 'insensitive' }
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            fullname: true,
                            username: true,
                            profile: {
                                select: { avatar: true, }
                            },
                        }
                    }
                },
                orderBy: { createdAt: 'asc' },
                skip: offset,
                take: limit,
            })

            let messagesWithMetadata: ({
                sender: {
                    id: string
                    username: string
                    fullname: string
                    profile: {
                        avatar: {
                            idx: string
                            secure_url: string
                            public_id: string
                            public_url: string
                        }
                    }
                }
            } & {
                id: string
                content: string
                senderId: string
                forumId: string
                createdAt: Date
                alignment: string
                read: boolean
            })[]

            if (lastReadMessageId !== null) {
                messagesWithMetadata = messages.map(message => ({
                    ...message,
                    read: message.id <= lastReadMessageId,
                    alignment: message.sender.id === sub ? 'right' : 'left'
                }))
            } else {
                messagesWithMetadata = messages.map(message => ({
                    ...message,
                    read: true,
                    alignment: message.sender.id === sub ? 'right' : 'left'
                }))
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: { forum, messages: messagesWithMetadata } })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error fetching forum messages")
        }
    }

    async requestToJoinForum(
        res: Response,
        forumId: string,
        { sub }: ExpressUser,
    ) {
        try {
            const existingRequest = await this.prisma.joinRequest.findFirst({
                where: {
                    forumId,
                    requesterId: sub,
                },
            })

            if (existingRequest) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'You have already requested to join this forum')
            }

            await this.prisma.joinRequest.create({
                data: {
                    forum: { connect: { id: forumId } },
                    requester: { connect: { id: sub } },
                    status: 'pending',
                },
            })

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: 'Request to join forum sent!',
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error requesting to join forum')
        }
    }

    async manageJoinRequest(
        res: Response,
        forumId: string,
        requestId: string,
        { sub }: ExpressUser,
        { action }: RequestDto,
    ) {
        try {
            const forum = await this.prisma.forum.findUnique({
                where: { id: forumId },
                include: { participants: { where: { userId: sub } } },
            })

            if (!forum || forum.participants.length === 0) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Forum not found or user is not a participant')
            }

            if (forum.ownerId !== sub) {
                return this.response.sendError(res, StatusCodes.Forbidden, 'Only the owner can manage join requests')
            }

            const request = await this.prisma.joinRequest.findUnique({
                where: { id: requestId, forumId },
                include: { forum: true, requester: true },
            })

            if (!request) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Join request not found')
            }

            if (action === 'accept') {
                await this.prisma.forumParticipant.create({
                    data: {
                        forum: { connect: { id: forumId } },
                        user: { connect: { id: request.requesterId } },
                    }
                })
            }

            await this.prisma.joinRequest.delete({ where: { id: requestId } })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: `Join request ${action === 'accept' ? 'accepted' : 'declined'}`,
            })
        } catch (err) {
            this.misc.handleServerError(res, err, `Error ${action === 'accept' ? 'accepting' : 'declining'} join request`)
        }
    }

    async fetchRequesters(
        res: Response,
        { sub }: ExpressUser
    ) {
        try {
            const requesters = await this.prisma.joinRequest.findMany({
                where: {
                    status: 'pending',
                    forum: {
                        participants: {
                            some: { userId: sub }
                        }
                    }
                },
                include: {
                    forum: {
                        select: { id: true, title: true, maxMembers: true }
                    },
                    requester: {
                        select: {
                            email: true,
                            fullname: true,
                            username: true,
                            profile: { select: { avatar: true } }
                        }
                    }
                },
                orderBy: { requestedAt: 'desc' }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: requesters })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
