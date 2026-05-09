import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';

export enum BankType {
  CHECKING_ACCOUNT = 'checking_account',
  VISTA_ACCOUNT = 'vista_account',
  SAVINGS_ACCOUNT = 'savings_account',
}

export class UpdateBankDataDto {
  @IsString()
  @IsNotEmpty()
  bank_holder_id: string;

  @IsString()
  @IsNotEmpty()
  bank_number: string;

  @IsEnum(BankType)
  @IsNotEmpty()
  bank_type: BankType;

  @IsString()
  @IsNotEmpty()
  @Matches(/^cl_.+$/, {
    message:
      'El bank_institution_id debe tener el formato válido de Fintoc (ej: cl_banco_estado)',
  })
  bank_institution_id: string;
}
