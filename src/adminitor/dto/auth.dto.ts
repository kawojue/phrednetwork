import { AdminitorRole } from 'enums/base'
import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class EmailDto {
    @ApiProperty({
        example: 'kawojue08@gmail.com'
    })
    @IsEmail()
    @IsNotEmpty()
    email: string
}

export class SignupDto extends EmailDto {
    @ApiProperty({
        example: '^sxbcjbs$123'
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(72, {
        message: 'Password is too long'
    })
    password: string

    @ApiProperty({
        enum: AdminitorRole
    })
    @IsNotEmpty()
    @IsEnum(AdminitorRole)
    role: AdminitorRole

    @ApiProperty({
        example: 'Raheem Kawojue'
    })
    @IsString()
    @IsNotEmpty()
    fullname: string
}

export class SigninDto extends EmailDto {
    @ApiProperty({
        example: '^sxbcjbs$123'
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(72, {
        message: 'Password is too long'
    })
    password: string
}

export class UpdateAdminitorProfile extends EmailDto {
    @ApiProperty({
        example: 'Raheem Kawojue'
    })
    @IsString()
    fullname: string
}