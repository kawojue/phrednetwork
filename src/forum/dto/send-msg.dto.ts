import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength } from 'class-validator'

export class SendMessageDto {
    @ApiProperty({
        example: "I just want to let y'all know that I love my woman so much"
    })
    @IsString()
    @MaxLength(445)
    content: string
}