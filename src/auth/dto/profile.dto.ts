import { ApiProperty } from '@nestjs/swagger'

export class UpdateProfileDto {
    @ApiProperty({
        example: 'John Doe',
    })
    fullname: string

    @ApiProperty({
        example: 'Always Appear',
    })
    username: string

    @ApiProperty({
        example: 'Launch into the moon'
    })
    bio: string
}