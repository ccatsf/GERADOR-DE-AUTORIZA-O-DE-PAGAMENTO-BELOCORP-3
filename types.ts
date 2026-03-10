
export interface Beneficiary {
  id: string;
  name: string;
  pix: string;
  document: string; // CPF/CNPJ
  type: string;
  bank: string;
  agency: string;
  account: string;
  amount: string;
}

export interface PaymentAuthData {
  clientName: string;
  clientCpf: string;
  contractNumber: string;
  totalAmount: string;
  // Novos campos para a Capa
  isContractAdditive: 'sim' | 'nao' | '';
  needsGuarantor: 'sim' | 'nao' | '';
  doctorName: string;
  paymentAmount: string; // Valor específico que aparece na capa como "Valor a pagar"
  beneficiaries: Beneficiary[];
}

export const INITIAL_BENEFICIARY: Beneficiary = {
  id: '1',
  name: '',
  pix: '',
  document: '',
  type: '',
  bank: '',
  agency: '',
  account: '',
  amount: '',
};

export const INITIAL_AUTH_DATA: PaymentAuthData = {
  clientName: '',
  clientCpf: '',
  contractNumber: '',
  totalAmount: '',
  isContractAdditive: '',
  needsGuarantor: '',
  doctorName: '',
  paymentAmount: '',
  beneficiaries: [{ ...INITIAL_BENEFICIARY, id: crypto.randomUUID() }],
};
