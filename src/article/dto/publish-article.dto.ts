import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class PublishArticleDto {
    @ApiProperty({
        example: 'Rhythm'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    title: string

    @ApiProperty({
        example: 'The quick brown fox jumps over the lazy dog'
    })
    @IsString()
    @MinLength(5)
    @IsNotEmpty()
    content: string

    @ApiProperty({
        example: ['Health', 'Disease']
    })
    @IsNotEmpty()
    category: string

    @ApiProperty({
        description: 'formdata key should be cover_photo'
    })
    cover_photo?: File
}