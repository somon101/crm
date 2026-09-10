import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ContactType } from '@prisma/client';

export class CreateTaskDto {
  @IsUUID()
  leadId!: string;

  // Ignored server-side for MANAGER callers (forced to self). Only meaningful when
  // an ADMIN creates a task on a manager's behalf.
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @Type(() => Date)
  @IsDate()
  dueAt!: Date;

  @IsEnum(ContactType)
  contactType!: ContactType;

  @IsOptional()
  @IsString()
  comment?: string;
}
