import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class ValidateBankDto {
    @ApiProperty({
        example: '044',
        description: 'The Code of the Bank the user selected'
    })
    @IsString()
    @IsNotEmpty()
    bank_code: string

    @ApiProperty({
        example: '1234567890',
        description: 'The Account number for the user.'
    })
    @IsString()
    @MinLength(10, {
        message: 'Account number must be at least 10 digits'
    })
    @MaxLength(10, {
        message: 'Account must be at most 10 digits'
    })
    @IsNotEmpty()
    account_number: string
}

export class GetBankNameDto {
    @ApiProperty({
        example: '044',
        description: 'The bank code of the bank selected'
    })
    @IsString()
    @IsNotEmpty()
    bankCode: string
}