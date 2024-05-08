
import { AdminitorRole } from 'enums/base'
import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'

export class InviteAdminitorDto {
    @ApiProperty({
        example: 'Raheem Kawojue'
    })
    @IsString()
    fullname: string

    @ApiProperty({
        example: 'kawojue08@gmail.com'
    })
    @IsEmail()
    email: string

    @ApiProperty({
        example: 'auditor',
        enum: AdminitorRole
    })
    @IsEnum(AdminitorRole)
    role: AdminitorRole
}

export class editAdminitorDto {
    @ApiProperty({
        default: null,
        example: 'Raheem Kawojue'
    })
    @IsOptional()
    @IsString()
    fullname: string

    @ApiProperty({
        default: null,
        example: 'kawojue08@gmail.com'
    })
    @IsOptional()
    @IsEmail()
    email: string

    @ApiProperty({
        default: null,
        example: 'auditor',
        enum: AdminitorRole
    })
    @IsOptional()
    @IsEnum(AdminitorRole)
    role: AdminitorRole
}