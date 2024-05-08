import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CommentDto {
    @ApiProperty({
        example: 'I love my girl so much! 🥰'
    })
    @IsString()
    @IsNotEmpty()
    content: string
}

export class FetchCommentsDto {
    @ApiProperty({
        example: 1,
        default: 1,
        description: 'The page number. This is optional and default is 1'
    })
    page?: number

    @ApiProperty({
        example: 15,
        default: 15,
        description: 'The limit per page. This is optional and default is 15'
    })
    limit?: number
}