import { UserStatus } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { Article, DonationAndAdverts } from 'enums/base'

export class AnalyticsDto {
    @ApiProperty({
        enum: DonationAndAdverts
    })
    @IsEnum(DonationAndAdverts)
    @IsOptional()
    donations: DonationAndAdverts

    @ApiProperty({
        enum: DonationAndAdverts
    })
    @IsEnum(DonationAndAdverts)
    @IsOptional()
    adverts: DonationAndAdverts

    @ApiProperty({
        enum: Article
    })
    @IsOptional()
    @IsEnum(Article)
    articles: Article

    @ApiProperty({
        enum: UserStatus
    })
    @IsOptional()
    @IsEnum(UserStatus)
    users: UserStatus
}