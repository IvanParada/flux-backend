import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateBankDataDto {
  @IsNotEmpty()
  @IsString()
  bank_holder_id: string;

  @IsNotEmpty()
  @IsString()
  bank_number: string;

  @IsNotEmpty()
  @IsString()
  bank_type: string;

  @IsNotEmpty()
  @IsString()
  bank_institution_id: string;
}
