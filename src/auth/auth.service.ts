import { Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { Injectable } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { PlunkService } from 'lib/plunk.service'
import { PrismaService } from 'lib/prisma.service'
import { Encryption } from 'lib/encryption.service'
import { UpdateProfileDto } from './dto/profile.dto'
import { AccountDetailDto } from './dto/acc-detail.dto'
import { VerificationDto } from './dto/verification.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'
import {
    ResetPasswordDto, UpdatePasswordDto, ResetPasswordTokenDto
} from './dto/password.dto'
import { LoginDto, RequestTokenDto, SignupDto } from './dto/auth.dto'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary'

@Injectable()
export class AuthService {
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
        { username, email, password, fullname }: SignupDto
    ) {
        try {
            fullname = titleName(fullname)
            email = email.trim().toLowerCase()
            username = username.trim().toLowerCase()

            if (!this.misc.isValidUsername(username)) {
                this.response.sendError(res, StatusCodes.BadRequest, 'Username is not allowed')
                return
            }

            const findByUsername = await this.prisma.user.findUnique({
                where: { username }
            })

            if (findByUsername) {
                this.response.sendError(res, StatusCodes.Conflict, 'Username has been taken')
                return
            }

            const findByEmail = await this.prisma.user.findUnique({
                where: { email }
            })

            if (findByEmail) {
                this.response.sendError(res, StatusCodes.Conflict, 'There is an account associated with this email')
                return
            }

            password = await this.encryption.hashAsync(password)

            const user = await this.prisma.user.create({
                data: { username, email, password, fullname }
            })

            let tk: {
                token: string
                randomCode: string
                token_expiry: Date
            }

            if (user) {
                tk = this.misc.genenerateToken(user.id)
                await Promise.all([
                    this.prisma.validation.create({
                        data: {
                            ...tk,
                            user: {
                                connect: {
                                    id: user.id
                                }
                            }
                        }
                    }),
                    this.prisma.connectModels(user.id)
                ])

                res.on('finish', async () => {
                    await this.plunk.sendVerificationEmail(email, tk.token)
                })
            }

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: 'Account created successfully'
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async login(res: Response, { email, password }: LoginDto) {
        try {
            email = email.trim().toLowerCase()
            const user = await this.prisma.user.findUnique({
                where: { email },
                include: {
                    verification: {
                        select: {
                            verified: true,
                            email_verified: true,
                        }
                    },
                    validation: true,
                }
            })

            if (!user) {
                this.response.sendError(res, StatusCodes.NotFound, 'Invalid email or password')
                return
            }

            if (user.userStatus === 'Suspended') {
                return this.response.sendError(res, StatusCodes.Unauthorized, 'Your account has been suspended')
            }

            const isMatch = await this.encryption.compareAsync(password, user.password)
            if (!isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect password')
                return
            }

            if (!user.verification.email_verified) {
                const token = this.misc.genenerateToken(user.id)
                let expired = user.validation ? new Date() > user.validation.token_expiry : false
                if ((!expired && !user.validation) || (expired && user.validation)) {
                    await this.prisma.validation.upsert({
                        where: {
                            userId: user.id,
                        },
                        create: {
                            ...token,
                            user: {
                                connect: {
                                    id: user.id
                                }
                            }
                        },
                        update: token
                    })
                    await this.plunk.sendVerificationEmail(user.email, token.token)
                }
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                access_token: await this.misc.generateAccessToken({
                    sub: user.id,
                    role: user.role,
                    username: user.username,
                    userStatus: user.userStatus,
                }),
                message: "Login Successful",
                data: {
                    email: user.email,
                    fullname: user.fullname,
                    username: user.username,
                    verified: user.verification.verified,
                    email_verified: user.verification.email_verified,
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async verifyEmail(res: Response, token: string) {
        try {
            const validation = await this.prisma.validation.findUnique({
                where: { token }
            })
            const isMatch = this.misc.validateToken(token, validation)

            if (!validation || !isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Token does not match')
                return
            }

            if ((await this.prisma.isTokenExpired(validation))) {
                this.response.sendError(res, StatusCodes.Forbidden, 'Token has expired')
                return
            }

            const verif = await this.prisma.verification.update({
                where: {
                    userId: validation.userId
                },
                data: {
                    email_verified: true
                }
            })
            await this.prisma.validation.delete({
                where: {
                    userId: verif.userId
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Your email is now verified"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async requestToken(
        res: Response,
        { email, token_type }: RequestTokenDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email }
            })

            if (!user) {
                this.response.sendError(res, StatusCodes.NotFound, "There is no email associated with this account")
                return
            }

            const token = this.misc.genenerateToken(user.id)

            if (token_type === 'email') {
                await this.plunk.sendVerificationEmail(email, token.token)
            } else if (token_type === 'password') {
                await this.plunk.sendPlunkEmail({
                    to: email,
                    subject: "Reset Password",
                    body: `${process.env.CLIENT_URL}/reset-password?token=${token.token}&token_type=password`
                })
            } else {
                this.response.sendError(res, StatusCodes.BadRequest, 'Invalid token type')
                return
            }

            await this.prisma.validation.upsert({
                where: {
                    userId: user.id
                },
                create: {
                    ...token,
                    user: {
                        connect: {
                            id: user.id
                        }
                    }
                },
                update: { ...token }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "New verification link has been sent to your email"
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
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub,
                }
            })

            if (password1 !== password2) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Passwords do not match")
            }

            const verifyPassword = await this.encryption.compareAsync(oldPassword, user.password)
            if (!verifyPassword) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Incorrect password")
            }

            const password = await this.encryption.hashAsync(password1)
            await this.prisma.user.update({
                where: {
                    id: sub
                },
                data: { password }
            })

            await this.prisma.notification.create({
                data: {
                    title: 'Password Update',
                    description: 'Your password has been updated successfully',
                    user: {
                        connect: {
                            id: sub
                        }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Password has been updated successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async resetPassword(
        res: Response,
        { password1, password2 }: ResetPasswordDto,
        { token_type, token }: ResetPasswordTokenDto,
    ) {
        try {
            if (token_type !== 'password') {
                this.response.sendError(res, StatusCodes.BadRequest, 'Invalid token type')
                return
            }

            if (password1 !== password2) {
                this.response.sendError(res, StatusCodes.BadRequest, 'Passwords not match')
                return
            }

            const validation = await this.prisma.validation.findUnique({
                where: { token }
            })
            const isMatch = this.misc.validateToken(token, validation)

            if (!validation || !isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Token does not match')
                return
            }

            if ((await this.prisma.isTokenExpired(validation))) {
                this.response.sendError(res, StatusCodes.Forbidden, 'Token has expired')
                return
            }

            const password = await this.encryption.hashAsync(password1)
            await this.prisma.user.update({
                where: {
                    id: validation.userId
                },
                data: { password }
            })
            await this.prisma.validation.delete({
                where: { token }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Password reseted successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async updateProfile(
        res: Response,
        { sub }: ExpressUser,
        file: Express.Multer.File, header: FileDest,
        { fullname, bio, username }: UpdateProfileDto,
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    profile: true
                }
            })

            if (fullname?.trim()) {
                fullname = titleName(fullname)
            }

            if (username && user.username !== username) {
                if (!this.misc.isValidUsername(username)) {
                    return this.response.sendError(res, StatusCodes.BadRequest, 'Username is not allowed')
                }

                const findByUsername = await this.prisma.user.findUnique({
                    where: { username }
                })

                if (findByUsername) {
                    return this.response.sendError(res, StatusCodes.Conflict, 'Username has been taken')
                }
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

                if (user.profile?.avatar?.public_id) {
                    await this.cloudinary.delete(user.profile.avatar.public_id)
                }

                uploadRes = await this.cloudinary.upload(file, header)
            }

            const updatedUser = await this.prisma.user.update({
                where: {
                    id: sub
                },
                include: {
                    profile: true
                },
                data: {
                    fullname: fullname ? fullname : user.fullname,
                    username: username ? username : user.username,
                    profile: {
                        update: {
                            bio: bio?.trim() ? bio.trim() : user.profile.bio ?? '',
                            avatar: {
                                public_url: uploadRes?.url ?? '',
                                public_id: uploadRes?.public_id ?? '',
                                secure_url: uploadRes?.secure_url ?? '',
                            }
                        }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    bio: updatedUser.profile.bio,
                    fullname: updatedUser.fullname,
                    username: updatedUser.username,
                    avatar: updatedUser.profile.avatar?.public_url
                },
                message: "Profile has been updated successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, err.message)
        }
    }

    async toggleFollow(
        res: Response,
        targetId: string,
        { sub }: ExpressUser,
    ) {
        try {
            const targetUser = await this.prisma.user.findUnique({
                where: {
                    id: targetId,
                },
            })

            if (!targetUser) {
                this.response.sendError(res, StatusCodes.NotFound, 'Target user not found')
                return
            }

            const existingFollow = await this.prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: sub,
                        followingId: targetId
                    }
                }
            })

            if (existingFollow) {
                const deletedFollow = await this.prisma.follow.deleteMany({
                    where: {
                        followerId: sub,
                        followingId: targetId,
                    },
                })

                if (deletedFollow.count === 0) {
                    this.response.sendError(res, StatusCodes.NotFound, 'No follow relation found to delete')
                    return
                }

                this.response.sendSuccess(res, StatusCodes.OK, {
                    message: 'Unfollowed successfully',
                })
            } else {
                if (targetId === sub) {
                    this.response.sendError(res, StatusCodes.Forbidden, 'IDs have the same references')
                    return
                }

                const follow = await this.prisma.follow.create({
                    data: {
                        follower: {
                            connect: {
                                id: sub
                            }
                        },
                        following: {
                            connect: {
                                id: targetId
                            }
                        }
                    }
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    data: follow,
                    message: "Now following"
                })
            }
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error toggling follow')
        }
    }

    async licenseSubmission(
        res: Response,
        { sub }: ExpressUser,
        {
            durationEnd, durationStart, licenseNumber,
            specialty, licenseOrCertificateType, isOwner,
        }: VerificationDto,
        attachments: Array<Express.Multer.File>
    ) {
        try {
            const verification = await this.prisma.verification.findUnique({
                where: {
                    userId: sub
                }
            })

            if (attachments.length > 2) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Only a maximum of two images is allowed')
            }

            const verification_status = this.misc.licenseVerificationStatus(verification)
            if (verification_status === 'PENDING') {
                return this.response.sendError(res, StatusCodes.Accepted, 'Your verification is in progress')
            }

            if (verification_status === 'SUCCESS') {
                return this.response.sendError(res, StatusCodes.Conflict, "You're already verified")
            }

            let filesArray = [] as Attachment[]
            if (attachments.length > 0) {
                try {
                    const results = await Promise.all(attachments.map(async (attachment) => {
                        const MAX_SIZE = 5 << 20
                        if (attachment.size > MAX_SIZE) {
                            return this.response.sendError(res, StatusCodes.PayloadTooLarge, `${attachment.originalname} is too large`)
                        }

                        const extension = attachment.originalname.split('.').pop()
                        if (!['jpg', 'png'].includes(extension)) {
                            return this.response.sendError(res, StatusCodes.UnsupportedContent, `File extension is not allowed - ${attachment.originalname}`)
                        }

                        const response = await this.cloudinary.upload(attachment, {
                            folder: `Phrednetwork/verification-proof/${sub}`,
                            resource_type: 'image'
                        })

                        return {
                            public_url: response.url,
                            public_id: response.public_id,
                            secure_url: response.secure_url,
                        }
                    }))

                    filesArray = results.filter((result): result is Attachment => !!result)
                } catch (err) {
                    try {
                        if (filesArray.length > 0) {
                            for (const file of filesArray) {
                                if (file?.public_id) {
                                    await this.cloudinary.delete(file.public_id)
                                }
                            }
                        }
                    } catch (err) {
                        console.error(err)
                        this.response.sendError(res, StatusCodes.InternalServerError, 'Error uploading attachments')
                        return
                    }
                }
            }

            const oldAttachements = verification.attachments
            if (oldAttachements.length > 0) {
                for (const attachment of oldAttachements) {
                    if (attachment?.public_id) {
                        await this.cloudinary.delete(attachment.public_id)
                    }
                }
            }

            await this.prisma.verification.update({
                where: { userId: sub },
                data: {
                    isOwner,
                    specialty,
                    licenseNumber,
                    verified: false,
                    status: 'In Progress',
                    submittedAt: new Date(),
                    attachments: filesArray,
                    licenseOrCertificateType,
                    durationEnd: durationEnd ? new Date(durationEnd) : undefined,
                    durationStart: durationStart ? new Date(durationStart) : undefined,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Your document has been submitted. You'll be notifed"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async populateAccountDetails(
        res: Response,
        { sub }: ExpressUser,
        { accountNumber, bankCode }: AccountDetailDto
    ) {
        try {
            const profile = await this.prisma.profile.findUnique({
                where: { userId: sub }
            })

            if (!profile) {
                return this.response.sendError(res, StatusCodes.NotFound, "Profile not found")
            }

            const { data } = await this.paystack.resolveAccount(accountNumber, bankCode)

            const bank = await this.paystack.getBankByBankCode(bankCode)

            const accountDetails = await this.prisma.accountDetail.upsert({
                where: { profileId: profile.id },
                create: {
                    bankCode: bankCode,
                    bankName: bank.name,
                    accountName: data.account_name,
                    accountNumber: data.account_number,
                    profile: { connect: { id: profile.id } }
                },
                update: {
                    bankCode: bankCode,
                    bankName: bank.name,
                    accountName: data.account_name,
                    accountNumber: data.account_number,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: accountDetails })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }
}
