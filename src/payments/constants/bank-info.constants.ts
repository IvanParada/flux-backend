export interface BankConstant {
  id: string;
  name: string;
}

export const CHILEAN_BANKS: BankConstant[] = [
  { id: 'cl_banco_estado', name: 'Banco Estado' },
  { id: 'cl_santander_cl', name: 'Santander' },
  { id: 'cl_bci', name: 'BCI' },
  { id: 'cl_banco_de_chile', name: 'Banco de Chile' },
  { id: 'cl_itau', name: 'Itaú' },
  { id: 'cl_scotiabank_azul', name: 'Scotiabank' },
  { id: 'cl_banco_falabella', name: 'Banco Falabella' },
];

export const ACCOUNT_TYPES: BankConstant[] = [
  { id: 'checking_account', name: 'Cuenta Corriente' },
  { id: 'vista_account', name: 'Cuenta Vista / RUT' },
  { id: 'savings_account', name: 'Cuenta de Ahorro' },
];
