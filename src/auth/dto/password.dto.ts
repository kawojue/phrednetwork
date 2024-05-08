import { Token } from 'enums/base'
import { TokenDto } from './auth.dto'
import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength, MaxLength, Matches, IsNotEmpty, IsEnum } from 'class-validator'

export class ResetPasswordDto {
    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6, {
        message: "Password must be at least 6 characters"
    })
    @MaxLength(72, {
        message: "Password is too long"
    })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit',
    })
    password1: string

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'Password confirmation for the user.',
    })
    @IsString()
    @IsNotEmpty()
    password2: string
}

export class UpdatePasswordDto {
    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The old password of the user.',
    })
    @IsNotEmpty({
        message: "Old password cannot be empty"
    })
    oldPassword: string

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
    })
    @IsString()
    @MinLength(6, {
        message: "Password must be at least 6 characters"
    })
    @MaxLength(72, {
        message: "Password is too long"
    })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit',
    })
    password1: string

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'Password confirmation for the user.',
    })
    @IsString()
    password2: string
}

export class ResetPasswordTokenDto extends TokenDto {
    @ApiProperty({
        enum: Token,
        example: 'password'
    })
    @IsEnum(Token)
    token_type: Token
}