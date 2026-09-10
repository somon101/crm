import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MessengerType, Temperature } from '@prisma/client';
import { VehicleInterestDto } from './vehicle-interest.dto';

export class CreateLeadDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  @MinLength(1)
  phone!: string;

  @IsOptional()
  @IsEnum(MessengerType)
  messengerType?: MessengerType;

  @IsOptional()
  @IsString()
  messengerContact?: string;

  @IsOptional()
  @IsString()
  additionalContactInfo?: string;

  @Type(() => Date)
  @IsDate()
  firstContactDate!: Date;

  @IsUUID()
  sourceId!: string;

  // Manager-supplied managerId is ignored server-side for MANAGER callers (forced to
  // self) — only meaningful when an ADMIN creates a lead on a manager's behalf.
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
  @IsString()
  contactReason?: string;

  @IsOptional()
  @IsString()
  managerNotes?: string;

  @IsOptional()
  @IsUUID()
  interestedTariffId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleInterestDto)
  vehicleInterest?: VehicleInterestDto;

  @IsOptional()
  @IsString()
  plannedPurchasePeriodText?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedPurchaseDate?: Date;

  @IsOptional()
  @IsString()
  plannedPurchaseComment?: string;
}
