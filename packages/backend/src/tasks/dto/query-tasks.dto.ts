import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class QueryTasksDto {
  // Ignored server-side for MANAGER callers — always forced to the caller's own id.
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueTo?: Date;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
