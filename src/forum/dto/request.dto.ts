import { Action } from 'enums/base'
import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RequestDto {
    @ApiProperty({
        enum: Action
    })
    @IsEnum(Action)
    action: Action
}