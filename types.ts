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
  quitacaoDate?: string; // Novo campo para Quitação
  beneficiaries: Beneficiary[];
}
