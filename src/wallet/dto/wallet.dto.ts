import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class RequestWithrawalDto {
    @ApiProperty({
        example: '2000.56'
    })
    @IsNumber()
    @IsNotEmpty()
    amountToWithdraw: number
}

export class FundWalletDTO {
    @ApiProperty({
        example: 'ref-fdknvkdnv-dvkdnv'
    })
    @IsString()
    ref: string
}