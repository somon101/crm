import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLossReasonDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
