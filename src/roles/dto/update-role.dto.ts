import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, [] as const),
) {
  @ApiPropertyOptional({
    description: 'Permission IDs to assign',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  permissionIds?: number[];
}
