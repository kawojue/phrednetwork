import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class AccountDetailDto {
    @ApiProperty({
        example: '035'
    })
    @IsString()
    @IsNotEmpty()
    bankCode: string

    @ApiProperty({
        example: '0227blahblah'
    })
    @IsString()
    @IsNotEmpty()
    accountNumber: string
}