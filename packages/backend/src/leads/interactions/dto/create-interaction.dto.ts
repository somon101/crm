import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { InteractionType } from '@prisma/client';

export class CreateInteractionDto {
  @IsEnum(InteractionType)
  type!: InteractionType;

  @IsString()
  @MinLength(1)
  comment!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;
}
