import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateTariffDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
