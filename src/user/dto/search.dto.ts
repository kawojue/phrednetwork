import { GlobalSearch } from 'enums/base'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class SearchDto {
    @ApiProperty({
        example: 'hehehe!'
    })
    @IsOptional()
    @IsString()
    q: string
}

export class GlobalSearchDto extends SearchDto {
    @ApiProperty({
        enum: GlobalSearch,
    })
    @IsOptional()
    @IsEnum(GlobalSearch)
    type: GlobalSearch
}