import { Action } from 'enums/base'
import { UserStatus } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'

export class UserSuspensionDto {
    @ApiProperty({
        enum: UserStatus
    })
    @IsEnum(UserStatus)
    q: UserStatus
}

export class LicenseSubmissionDto {
    @ApiProperty({
        enum: Action
    })
    @IsEnum(Action)
    q: Action

    @ApiProperty({
        example: 'Invalid certificate',
        description: "It's optional. This is a case whereby the verification was delined"
    })
    @IsOptional()
    reason?: string
}