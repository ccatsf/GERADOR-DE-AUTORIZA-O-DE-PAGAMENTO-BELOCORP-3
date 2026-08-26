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
  observation?: string;
}

export const createEmptyBeneficiary = (): Beneficiary => ({
  id: Math.random().toString(36).substring(2, 9),
  name: '',
  pix: '',
  document: '',
  type: '',
  bank: '',
  agency: '',
  account: '',
  amount: '',
  observation: '',
});

export const normalizePaymentAuthData = (raw?: Partial<PaymentAuthData> | null): PaymentAuthData => {
  const defaults: PaymentAuthData = {
    clientName: '',
    clientCpf: '',
    contractNumber: '',
    totalAmount: '',
    isContractAdditive: '',
    needsGuarantor: '',
    doctorName: '',
    paymentAmount: '',
    expectedPaymentDate: '',
    beneficiaries: [createEmptyBeneficiary()],
  };

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const beneficiaries = Array.isArray(raw.beneficiaries) && raw.beneficiaries.length > 0
    ? raw.beneficiaries.map((beneficiary, index) => ({
        id: beneficiary?.id || String(index + 1),
        name: beneficiary?.name || '',
        pix: beneficiary?.pix || '',
        document: beneficiary?.document || '',
        type: beneficiary?.type || '',
        bank: beneficiary?.bank || '',
        agency: beneficiary?.agency || '',
        account: beneficiary?.account || '',
        amount: beneficiary?.amount || '',
        observation: beneficiary?.observation || '',
      }))
    : defaults.beneficiaries;

  return {
    ...defaults,
    ...raw,
    beneficiaries,
  };
};

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
  expectedPaymentDate?: string; // Data de pagamento prevista (ex.: '2026-08-26')
  quitacaoDate?: string; // Novo campo para Quitação
  beneficiaries: Beneficiary[];
  
  // Campos editáveis da CAPA
  capaTitle1?: string; // "AUTORIZAÇÃO DE PAGAMENTO"
  capaTitle2?: string; // "BELOGROUP"
  capaLabel1?: string; // "Cliente:"
  capaLabel2?: string; // "CPF:"
  capaLabel3?: string; // "Valor do plano:"
  capaLabel4?: string; // "Contrato aditivo?"
  capaLabel5?: string; // "Valor a pagar:"
  capaLabel6?: string; // "Necessidade de avalista?"
  capaLabel7?: string; // "Médico (a):"
  capaLabel8?: string; // "Data de pagamento prevista:"
  checklistAdminTitle?: string; // "CHECKLIST ADMINISTRATIVO:"
  checklistFinanceiroTitle?: string; // "CHECKLIST FINANCEIRO:"
  
  // Campos editáveis da AUTORIZAÇÃO
  authTitle?: string; // "AUTORIZAÇÃO DE PAGAMENTO – CLIENTE"
  authParagraph?: string; // Parágrafo principal completo
  valorTotalLabel?: string; // "Valor Total:"
  beneficiaryLabel?: string; // "Beneficiário"
  pixLabel?: string; // "PIX:"
  docLabel?: string; // "CPF/CNPJ:"
  typeLabel?: string; // "Tipo:"
  bankLabel?: string; // "Banco:"
  agencyLabel?: string; // "Agência:"
  accountLabel?: string; // "Conta:"
  amountLabel?: string; // "Valor:"
  
  // Campos editáveis da QUITAÇÃO
  quitacaoTitle1?: string; // "AUTORIZAÇÃO DE PAGAMENTO"
  quitacaoTitle2?: string; // "QUITAÇÃO"
  quitacaoSubtitle?: string; // "(Uso Interno)"
  quitacaoSubheader?: string; // "BELOGROUP – PLANOS PROGRAMADOS"
  quitacaoClientLabel?: string; // "Nome Cliente:"
  quitacaoCpfLabel?: string; // "CPF:"
  quitacaoContractLabel?: string; // "Contrato nº:"
  quitacaoAmountLabel?: string; // "Valor a receber:"
  quitacaoDateLabel?: string; // "Plano quitado em:"
  quitacaoBankDataTitle?: string; // "DADOS BANCÁRIOS"
  quitacaoBeneficiaryLabel?: string; // "Beneficiário:"
  quitacaoDocLabel?: string; // "CPF/CNPJ:"
  quitacaoBankLabel?: string; // "Banco:"
  quitacaoAgencyLabel?: string; // "Agencia:"
  quitacaoAccountLabel?: string; // "Conta:"
  quitacaoTypeLabel?: string; // "Tipo:"
  quitacaoPixLabel?: string; // "PIX:"
}
