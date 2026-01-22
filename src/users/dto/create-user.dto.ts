import {
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'newuser', description: 'Username' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  username: string;

  @ApiProperty({ example: 'securePass123', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({ description: 'Tenant ID for company admins' })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Role IDs to assign', type: [Number] })
  @IsOptional()
  roleIds?: number[];

  @ApiPropertyOptional({ description: 'Is the user active?', default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  last_name?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar_url?: string;

  @ApiPropertyOptional({ description: 'Password changed at' })
  @IsDateString()
  @IsOptional()
  password_changed_at?: string;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @IsUUID()
  @IsOptional()
  created_by?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @IsUUID()
  @IsOptional()
  updated_by?: string;
}
