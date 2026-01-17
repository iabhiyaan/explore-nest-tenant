import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, [] as const),
) {
  @ApiPropertyOptional({ description: 'Whether the tenant is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
