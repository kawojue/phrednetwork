import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsUrl } from 'class-validator'

export class PostAdvertDto {
    @ApiProperty({
        example: "Sex Toy"
    })
    @IsString()
    @IsNotEmpty()
    productName: string

    @ApiProperty({
        type: File,
        format: 'binary',
        description: 'The formdata key should be prod_img'
    })
    productImage?: File

    @ApiProperty({
        example: "['Health', 'Sex']",
        description: "Should be selected from caterogies"
    })
    @IsNotEmpty()
    keyword: string

    @ApiProperty({
        example: 'Lmao, for pleasure!'
    })
    @IsString()
    @IsNotEmpty()
    description: string

    @ApiProperty({
        example: 'https://google.com'
    })
    @IsUrl()
    @IsNotEmpty()
    action_link: string
}