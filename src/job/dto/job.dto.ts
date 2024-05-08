import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator'

export class PostJobDto {
    @ApiProperty({
        example: 'Radiology'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string

    @ApiProperty({
        example: 'Journalist for nurses of doctors 😂'
    })
    @IsString()
    @MaxLength(200)
    @IsNotEmpty()
    description: string

    @ApiProperty({
        example: 'https://google.com'
    })
    @IsUrl()
    @IsNotEmpty()
    actionLink: string
}