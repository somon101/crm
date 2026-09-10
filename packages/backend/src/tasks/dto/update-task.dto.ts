import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { ContactType, TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsInt()
  version!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  @IsOptional()
  @IsEnum(ContactType)
  contactType?: ContactType;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
