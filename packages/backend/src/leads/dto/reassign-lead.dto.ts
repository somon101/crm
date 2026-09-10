import { IsUUID } from 'class-validator';

export class ReassignLeadDto {
  @IsUUID()
  managerId!: string;
}
