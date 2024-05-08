import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class VerificationDto {
    @ApiProperty({
        example: '2024-03-19T12:30:45Z',
        description: 'Date Issued'
    })
    durationStart: string

    @ApiProperty({
        example: '2024-04-19T12:30:45Z',
        description: 'Expiry Date'
    })
    @IsOptional()
    durationEnd?: string

    @ApiProperty({
        example: 'Surgeon',
        description: "The user's specialty in the medical field"
    })
    @IsString()
    specialty: string

    @ApiProperty({
        example: "Medical License",
        description: "The license type for the user"
    })
    @IsString()
    licenseOrCertificateType: string

    @ApiProperty({
        example: 'MD1234567',
        description: 'Medical License number'
    })
    @IsString()
    @IsOptional()
    licenseNumber?: string

    @ApiProperty({
        example: true,
        description: 'Do you actually own this document?'
    })
    @IsBoolean()
    isOwner: boolean

    @ApiProperty({
        type: [File],
        description: 'Array of file objects representing attachments'
    })
    @IsOptional()
    attachments?: File[]
}