import { Token } from 'enums/base'
import {
    MaxLength, IsNotEmpty, MinLength,
    IsEmail, IsEnum, IsString, Matches,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UsernameDto {
    @ApiProperty({
        example: 'kawojue',
        description: 'The username for the user.',
    })
    @IsString()
    @MaxLength(23, {
        message: "Username is too long"
    })
    @MinLength(2, {
        message: "Username is too short"
    })
    @IsNotEmpty()
    username: string
}

export class SignupDto extends UsernameDto {
    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'The email address for the user.',
    })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email cannot be empty' })
    email: string

    @ApiProperty({
        example: 'John Doe',
        description: 'The full name of the user.',
    })
    @IsString({ message: 'Full name must be a string' })
    @IsNotEmpty({ message: 'Full name cannot be empty' })
    fullname: string

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
    })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit',
    })
    @IsNotEmpty({ message: 'Password cannot be empty' })
    password: string
}

export class LoginDto {
    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'The email address for the user.',
    })
    @IsString()
    @IsEmail({}, { message: 'Invalid email format' })
    email: string

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
    })
    @IsString()
    password: string
}

export class TokenDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: '026c567f8000d5a4ccd83fe61d822c4fcb7a148e9af72aa03a',
        description: 'The token gotten from the URL will be sent as a query'
    })
    token: string
}

export class TokenEnumDto {
    @ApiProperty({
        enum: Token,
        example: 'email'
    })
    @IsEnum(Token)
    token_type: Token
}

export class RequestTokenDto extends TokenEnumDto {
    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'The email address for the user.',
    })
    @IsString()
    @IsEmail({}, { message: 'Invalid email format' })
    email: string
}