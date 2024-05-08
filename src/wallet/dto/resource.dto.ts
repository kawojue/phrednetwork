import { ApiProperty } from '@nestjs/swagger'
import { MemebershipDuration } from '@prisma/client'
import { IsEnum, IsNotEmpty, IsNumber, Max, Min } from 'class-validator'

export class BoostingDto {
    @ApiProperty({
        example: 10
    })
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    @Max(30)
    days: number
}

export class MembershipDto {
    @ApiProperty({
        enum: MemebershipDuration
    })
    @IsNotEmpty()
    @IsEnum(MemebershipDuration)
    duration: MemebershipDuration
}