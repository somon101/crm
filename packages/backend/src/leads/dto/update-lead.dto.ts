import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MessengerType, Temperature } from '@prisma/client';
import { UpdateVehicleInterestDto } from './update-vehicle-interest.dto';
import { MAX_CAR_YEAR, MIN_CAR_YEAR } from '../../common/constants';

export class UpdateLeadDto {
  // Optimistic-concurrency guard: must match the row's current version or the
  // update is rejected with 409 (see LeadsService.update).
  @IsInt()
  version!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @IsOptional()
  @IsEnum(MessengerType)
  messengerType?: MessengerType;

  @IsOptional()
  @IsString()
  messengerContact?: string;

  @IsOptional()
  @IsString()
  additionalContactInfo?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  firstContactDate?: Date;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

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
  @Type(() => UpdateVehicleInterestDto)
  vehicleInterest?: UpdateVehicleInterestDto;

  @IsOptional()
  @IsString()
  plannedPurchasePeriodText?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedPurchaseDate?: Date | null;

  @IsOptional()
  @IsString()
  plannedPurchaseComment?: string;

  // Result of working the lead — set once a bought/not-bought outcome is known.
  @IsOptional()
  @IsUUID()
  purchasedTariffId?: string;

  @IsOptional()
  @IsString()
  purchasedCarMake?: string;

  @IsOptional()
  @IsString()
  purchasedCarModel?: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_CAR_YEAR)
  @Max(MAX_CAR_YEAR)
  purchasedCarYear?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  purchaseDate?: Date;

  @IsOptional()
  @IsUUID()
  lossReasonId?: string;

  @IsOptional()
  @IsString()
  lossComment?: string;
}
