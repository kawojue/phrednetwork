import {
  Body, Controller, Delete, Post,
  Param, Req, Res, UseGuards, Get
} from '@nestjs/common'
import { Response } from 'express'
import { PostJobDto } from './dto/job.dto'
import { JobService } from './job.service'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'

@ApiTags("Job")
@Controller('job')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @Get('/fetch')
  async fetchJobs(@Res() res: Response, @Req() req: IRequest) {
    return await this.jobService.fetchJobs(res, req.user)
  }

  @Post('/post')
  async postJob(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: PostJobDto,
  ) {
    return await this.jobService.postJob(res, req.user, body)
  }

  @Delete('/:jobId')
  async removeJob(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('jobId') jobId: string
  ) {
    return await this.jobService.removeJob(res, jobId, req.user)
  }
}
