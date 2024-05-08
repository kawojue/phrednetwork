import { Response } from 'express'
import { Job } from '@prisma/client'
import { PostJobDto } from './dto/job.dto'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'

@Injectable()
export class JobService {
    constructor(
        private readonly misc: MiscService,
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
    ) { }

    async postJob(
        res: Response,
        { sub, role }: ExpressUser,
        { name, description, actionLink }: PostJobDto
    ) {
        try {
            let job: Job

            if (role === "user") {
                const user = await this.prisma.user.findUnique({
                    where: { id: sub }
                })

                if (!user) {
                    return this.response.sendError(res, StatusCodes.NotFound, "User not found")
                }

                const isNotAMember = await this.prisma.isMembershipExpired(sub)
                if (isNotAMember) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, "Become a member to start posting jobs")
                }

                job = await this.prisma.job.create({
                    data: { name, description, actionLink, user: { connect: { id: sub } } }
                })
            } else if (role === "admin" || role === "auditor") {
                job = await this.prisma.job.create({
                    data: { name, description, actionLink, adminitor: { connect: { id: sub } } }
                })
            } else {
                return this.response.sendError(res, StatusCodes.Forbidden, "Invalid role")
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: job })
        } catch (err) {
            this.misc.handleServerError(res, err, "Someting went wrong while posting job")
        }
    }

    async removeJob(
        res: Response,
        jobId: string,
        { sub, role }: ExpressUser,
    ) {
        try {
            const job = await this.prisma.job.findUnique({
                where: { id: jobId }
            })

            if (!job) {
                return this.response.sendError(res, StatusCodes.NotFound, "Job not found")
            }

            if (role === "user") {
                if (job.userId !== sub) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, "Can't delete job")
                }

                await this.prisma.job.delete({
                    where: { id: jobId }
                })
            } else if (role === "admin" || role === "auditor") {
                await this.prisma.job.delete({
                    where: { id: jobId }
                })
            } else {
                return this.response.sendError(res, StatusCodes.Forbidden, "Invalid role")
            }

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Job removed successfully" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchJobs(
        res: Response,
        { sub, role }: ExpressUser,
    ) {
        let jobs: Job[]

        if (role === "user") {
            jobs = await this.prisma.job.findMany({
                where: { userId: sub }
            })
        } else if (role === "admin" || role === "auditor") {
            jobs = await this.prisma.job.findMany()
        } else {
            return this.response.sendError(res, StatusCodes.Forbidden, "Invalid role")
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: jobs })
    }
}
