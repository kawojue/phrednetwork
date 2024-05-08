import { ApiProperty } from '@nestjs/swagger'
import { BooleanString, Tab } from 'enums/base'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class newsFeedDto {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page?: number

    @ApiProperty({
        example: 9
    })
    @IsOptional()
    limit?: number

    @ApiProperty({
        enum: Tab
    })
    @IsEnum(Tab)
    tab: Tab
}

export class SearchDto {
    @ApiProperty({
        example: 'kawojue'
    })
    @IsString()
    @IsOptional()
    search: string
}

export class InfiniteScrollDto extends SearchDto {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page: number

    @ApiProperty({
        example: 30
    })
    @IsOptional()
    limit: number
}

export class AllUsersDto extends InfiniteScrollDto {
    @ApiProperty({
        default: 0,
        example: '2024-01-01T00:00:00.000Z',
        description: 'The starting date. This is optional and could be 0',
    })
    @IsOptional()
    startDate?: string

    @ApiProperty({
        default: new Date().toISOString(),
        example: '2024-02-01T00:00:00.000Z',
        description: 'The ending date. This is optional and default is current date'
    })
    @IsOptional()
    endDate?: string

    @ApiProperty({
        enum: BooleanString
    })
    @IsOptional()
    pending_verification: BooleanString

    @ApiProperty({
        enum: BooleanString
    })
    @IsOptional()
    withdrawal_request: BooleanString
}

export class AllArticlesDto extends InfiniteScrollDto {
    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        default: 0,
        description: 'The starting date. This is optional and could be 0',
    })
    @IsOptional()
    startDate?: string

    @ApiProperty({
        example: '2024-02-01T00:00:00.000Z',
        default: new Date().toISOString(),
        description: 'The ending date. This is optional and default is current date'
    })
    @IsOptional()
    endDate?: string

    @ApiProperty({
        enum: BooleanString
    })
    @IsOptional()
    pending_approval: BooleanString
}

export class AllAdvertsDto extends InfiniteScrollDto {
    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        default: 0,
        description: 'The starting date. This is optional and could be 0',
    })
    @IsOptional()
    startDate?: string

    @ApiProperty({
        example: '2024-02-01T00:00:00.000Z',
        default: new Date().toISOString(),
        description: 'The ending date. This is optional and default is current date'
    })
    @IsOptional()
    endDate?: string

    @ApiProperty({
        enum: BooleanString
    })
    @IsOptional()
    pending_approval: BooleanString
}

export class AllForumsDto extends InfiniteScrollDto {
    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        default: 0,
        description: 'The starting date. This is optional and could be 0',
    })
    @IsOptional()
    startDate?: string

    @ApiProperty({
        example: '2024-02-01T00:00:00.000Z',
        default: new Date().toISOString(),
        description: 'The ending date. This is optional and default is current date'
    })
    @IsOptional()
    endDate?: string
}