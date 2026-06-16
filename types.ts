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
