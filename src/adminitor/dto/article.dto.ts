import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class DisapproveDto {
    @ApiProperty({
        example: 'It goes against our community standard'
    })
    @IsString()
    @IsOptional()
    reason: string
}