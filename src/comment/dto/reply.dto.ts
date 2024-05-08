import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class ReplyDto {
    @ApiProperty({
        example: 'Tbh! I still love my girl so much! 🥰'
    })
    @IsString()
    @IsNotEmpty()
    content: string
}