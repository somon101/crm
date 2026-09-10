import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { VehicleInterestType } from '@prisma/client';
import { MAX_CAR_YEAR, MIN_CAR_YEAR } from '../../common/constants';

export class UpdateVehicleInterestDto {
  @IsOptional()
  @IsEnum(VehicleInterestType)
  interestType?: VehicleInterestType;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_CAR_YEAR)
  @Max(MAX_CAR_YEAR)
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
