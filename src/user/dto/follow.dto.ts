import { } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class FollowDto {
    @ApiProperty({
        example: 1,
        default: 1
    })
    page: number

    @ApiProperty({
        example: 5,
        default: 5
    })
    limit: number
}