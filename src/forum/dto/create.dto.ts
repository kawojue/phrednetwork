import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateForumDto {
    @ApiProperty({
        example: 'The use of contraceptives'
    })
    @IsString()
    @MaxLength(100)
    title: string

    @ApiProperty({
        example: 10
    })
    maxMembers: number

    @ApiProperty({
        example: 'This a is forum for whatever'
    })
    @IsString()
    @IsOptional()
    @MaxLength(200)
    description: string

    @ApiProperty({
        example: "['Health', 'Sex']",
    })
    @IsNotEmpty()
    keyword: string

    @ApiProperty({
        type: File
    })
    profile_image?: File
}