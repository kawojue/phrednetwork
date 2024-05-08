import { ApiProperty } from '@nestjs/swagger'

export class ArticlesDto {
    @ApiProperty({
        example: 1,
        default: 1
    })
    page: number

    @ApiProperty({
        example: 4,
        default: 4
    })
    limit: number
}