import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Temperature } from '@prisma/client';

export class QueryLeadsDto {
  @IsOptional()
  @IsString()
  search?: string;

  // Ignored server-side for MANAGER callers — LeadsService always forces the
  // caller's own id instead. Only meaningful for ADMIN.
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsEnum(Temperature)
  temperature?: Temperature;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsUUID()
  tariffId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdTo?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextContactFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextContactTo?: Date;

  @IsOptional()
  @IsIn(['BOUGHT', 'NOT_BOUGHT', 'IN_PROGRESS'])
  result?: 'BOUGHT' | 'NOT_BOUGHT' | 'IN_PROGRESS';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
