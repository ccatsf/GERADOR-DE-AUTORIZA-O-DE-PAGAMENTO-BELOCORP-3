
import React, { forwardRef } from 'react';
import { PaymentAuthData } from '../types';

interface Props {
  data: PaymentAuthData;
  onUpdate?: (data: Partial<PaymentAuthData>) => void;
  onUpdateBeneficiary?: (id: string, updates: Partial<Beneficiary>) => void;
}

const DocumentPreview = forwardRef<HTMLDivElement, Props>(({ data, onUpdate, onUpdateBeneficiary }, ref) => {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const displayAmount = (amount: string) => {
    if (!amount) return 'R$ 0,00';
    if (amount.includes('R$')) return amount;
    return `R$ ${amount}`;
  };

  const handleBlur = (field: keyof PaymentAuthData, value: string) => {
    if (onUpdate) {
      onUpdate({ [field]: value });
    }
  };

  const handleBeneficiaryBlur = (id: string, field: keyof Beneficiary, value: string) => {
    if (onUpdateBeneficiary) {
      onUpdateBeneficiary(id, { [field]: value });
    }
  };

  const checklistAdmin = [
    'Nota promissória preenchida corretamente?',
    'Documentação do cliente anexado em sistema?',
    'Documentação do Avalista?',
    'Laudo médico?',
    'Autorização de pagamento Belomotors',
    'Orçamento Belocred'
  ];

  const checklistFinanceiro = [
    'Nome/Razão social confere com autorização?',
    'Dados bancários completos?',
    'Valor digitado confere com documento e sistema?',
    'Documento legível (sem corte e borrão)?',
    'Pagamento registrado no sistema Houster?',
    'Lançamento no drive?'
  ];

  // Tamanho 14pt para a Capa (conforme solicitado para manter)
  const fontSizeCapa = { fontSize: '14pt' };
  
  // Tamanho reduzido para a Autorização (conforme solicitado para diminuir)
  const fontSizeAuthBody = { fontSize: '11pt' };
  const fontSizeAuthHeader = { fontSize: '12pt' };

  const editableClass = "hover:bg-blue-50 focus:bg-blue-100 outline-none transition-colors cursor-text rounded";

  return (
    <div className="a4-preview-wrapper flex flex-col items-center space-y-12 pb-20">
      <div className="no-print bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-4 py-2 rounded-full text-xs font-bold shadow-sm flex items-center space-x-2 animate-bounce">
        <i className="fas fa-info-circle"></i>
        <span>Dica: Você pode clicar e editar os textos diretamente no documento abaixo!</span>
      </div>

      {/* PÁGINA 1: CAPA */}
      <div
        id="capa-documento"
        className="a4-page-shadow text-black"
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#000',
          padding: '5mm',
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          width: '210mm',
          height: '297mm'
        }}
      >
        <div style={{ 
          border: '2px solid black', 
          height: '100%', 
          padding: '8mm 12mm', 
          display: 'flex', 
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          
          <div style={{ border: '2px solid black', padding: '10px', marginBottom: '15px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '1px' }}>AUTORIZAÇÃO DE PAGAMENTO</h1>
            <h1 style={{ fontSize: '16pt', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>BELOGROUP</h1>
          </div>

          <div style={{ borderBottom: '2px solid black', marginBottom: '15px' }}></div>

          {/* Mantido 14pt na Capa */}
          <div style={{ marginBottom: '20px', lineHeight: '1.5', ...fontSizeCapa }}>
            <p style={{ margin: '6px 0' }}>
              Cliente: 
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => handleBlur('clientName', e.currentTarget.textContent || '')}
                className={editableClass}
                style={{ fontWeight: 'bold', textTransform: 'uppercase', minWidth: '100px', display: 'inline-block' }}
              >
                {data.clientName || '__________________________________________________'}
              </span>
            </p>
            <p style={{ margin: '6px 0' }}>
              CPF: 
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => handleBlur('clientCpf', e.currentTarget.textContent || '')}
                className={editableClass}
                style={{ fontWeight: 'bold', minWidth: '50px', display: 'inline-block' }}
              >
                {data.clientCpf || '__________________'}
              </span>
            </p>
            <p style={{ margin: '6px 0' }}>
              Valor do plano: 
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => handleBlur('totalAmount', e.currentTarget.textContent || '')}
                className={editableClass}
                style={{ fontWeight: 'bold', minWidth: '50px', display: 'inline-block' }}
              >
                {displayAmount(data.totalAmount)}
              </span>
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}>
              <span style={{ marginRight: '12px' }}>Contrato aditivo?</span>
              <span 
                onClick={() => onUpdate?.({ isContractAdditive: 'sim' })}
                className="cursor-pointer hover:text-blue-600 transition-colors"
                style={{ marginRight: '15px' }}
              >
                SIM ( {data.isContractAdditive === 'sim' ? 'X' : ' '} )
              </span>
              <span 
                onClick={() => onUpdate?.({ isContractAdditive: 'nao' })}
                className="cursor-pointer hover:text-blue-600 transition-colors"
                style={{ marginRight: '30px' }}
              >
                NÃO ( {data.isContractAdditive === 'nao' ? 'X' : ' '} )
              </span>
              <span>
                Valor a pagar: 
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('paymentAmount', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontWeight: 'bold', minWidth: '50px', display: 'inline-block' }}
                >
                  {displayAmount(data.paymentAmount || data.totalAmount)}
                </span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
              <span style={{ marginRight: '12px' }}>Necessidade de avalista?</span>
              <span 
                onClick={() => onUpdate?.({ needsGuarantor: 'sim' })}
                className="cursor-pointer hover:text-blue-600 transition-colors"
                style={{ marginRight: '15px' }}
              >
                SIM ( {data.needsGuarantor === 'sim' ? 'X' : ' '} )
              </span>
              <span 
                onClick={() => onUpdate?.({ needsGuarantor: 'nao' })}
                className="cursor-pointer hover:text-blue-600 transition-colors"
                style={{ marginRight: '15px' }}
              >
                NÃO ( {data.needsGuarantor === 'nao' ? 'X' : ' '} )
              </span>
            </div>

            <div style={{ margin: '15px 0', display: 'flex', borderBottom: '1px solid black' }}>
              <span style={{ marginRight: '10px', whiteSpace: 'nowrap' }}>Médico (a):</span>
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => handleBlur('doctorName', e.currentTarget.textContent || '')}
                className={editableClass}
                style={{ fontWeight: 'bold', flex: 1, paddingBottom: '2px' }}
              >
                {data.doctorName || ''}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '2px solid black', paddingTop: '15px', marginBottom: '20px' }}></div>

          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '13pt', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase' }}>CHECKLIST ADMINISTRATIVO:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {checklistAdmin.map((item, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11.5pt', paddingLeft: '15px' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '12px' }}>•</span>
                    {item}
                  </span>
                  <span style={{ fontWeight: 'normal', cursor: 'pointer' }} className="hover:text-blue-600">( &nbsp;&nbsp;&nbsp;&nbsp; )</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13pt', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase' }}>CHECKLIST FINANCEIRO:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {checklistFinanceiro.map((item, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11.5pt', paddingLeft: '15px' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '12px' }}>•</span>
                    {item}
                  </span>
                  <span style={{ fontWeight: 'normal', cursor: 'pointer' }} className="hover:text-blue-600">( &nbsp;&nbsp;&nbsp;&nbsp; )</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ borderBottom: '2px solid black', marginTop: 'auto', marginBottom: '0' }}></div>
        </div>
      </div>

      {/* PÁGINA 2: DOCUMENTO DE AUTORIZAÇÃO (LETRAS DIMINUÍDAS) */}
      <div
        id="autorizacao-documento"
        className="a4-page-shadow text-black"
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#000',
          padding: '12mm 15mm',
          backgroundColor: 'white',
          boxSizing: 'border-box',
          width: '210mm',
          minHeight: '297mm',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ border: '2px solid black', padding: '10px', marginBottom: '15px' }}>
          <h2 style={{ ...fontSizeAuthHeader, fontWeight: 'bold', margin: 0, textAlign: 'center', textTransform: 'uppercase' }}>
            AUTORIZAÇÃO DE PAGAMENTO – CLIENTE
          </h2>
        </div>

        {/* REPARO CRÍTICO: Removido textAlign justify e spans complexos que bugavam com nomes longos */}
        <div style={{ 
          border: '2px solid black', 
          padding: '15px', 
          marginBottom: '15px', 
          ...fontSizeAuthBody, 
          lineHeight: '1.5', 
          textAlign: 'left',
          backgroundColor: 'white'
        }}>
          <p style={{ margin: 0, wordBreak: 'normal', whiteSpace: 'normal' }}>
            <span style={{ textTransform: 'uppercase' }}>EU, </span>
            <span 
              contentEditable 
              suppressContentEditableWarning
              onBlur={(e) => handleBlur('clientName', e.currentTarget.textContent || '')}
              className="hover:bg-blue-50 focus:bg-blue-100 outline-none transition-colors cursor-text rounded"
              style={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'inline' }}
            >
              {data.clientName || '__________________________________________________'}
            </span>
            <span style={{ textTransform: 'uppercase' }}>, PORTADOR (A) DO CPF: </span>
            <span 
              contentEditable 
              suppressContentEditableWarning
              onBlur={(e) => handleBlur('clientCpf', e.currentTarget.textContent || '')}
              className="hover:bg-blue-50 focus:bg-blue-100 outline-none transition-colors cursor-text rounded"
              style={{ fontWeight: 'bold', display: 'inline' }}
            >
              {data.clientCpf || '__________________'}
            </span>
            <span style={{ textTransform: 'uppercase' }}>, AUTORIZO A EMPRESA </span>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase', display: 'inline' }}>
              BELOGROUP INTERMEDIADORA DE SERVIÇOS LTDA – CNPJ: 27.246.092/0001-40
            </span>
            <span style={{ textTransform: 'uppercase' }}> A UTILIZAR O CRÉDITO REFERENTE AO MEU CONTRATO N°. </span>
            <span 
              contentEditable 
              suppressContentEditableWarning
              onBlur={(e) => handleBlur('contractNumber', e.currentTarget.textContent || '')}
              className="hover:bg-blue-50 focus:bg-blue-100 outline-none transition-colors cursor-text rounded"
              style={{ fontWeight: 'bold', display: 'inline' }}
            >
              {data.contractNumber || '_______'}
            </span>.
          </p>
          
          <div style={{ marginTop: '15px' }}>
            <p style={{ fontWeight: 'bold', margin: 0 }}>
              VALOR TOTAL: 
              <span 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => handleBlur('totalAmount', e.currentTarget.textContent || '')}
                className="hover:bg-blue-50 focus:bg-blue-100 outline-none transition-colors cursor-text rounded"
                style={{ display: 'inline' }}
              >
                {displayAmount(data.totalAmount)}
              </span>
            </p>
            <p style={{ fontWeight: 'bold', marginTop: '8px', textTransform: 'uppercase' }}>PARA PAGAR SEGUINTES BENEFICIÁRIOS:</p>
          </div>
        </div>

        <div className="beneficiaries-list">
          {data.beneficiaries.map((ben, index) => ( 
            <div 
              key={ben.id} 
              className="avoid-break"
              style={{ 
                border: '2px solid black', 
                padding: '6px 10px', 
                marginBottom: '6px',
                fontSize: '9pt',
                breakInside: 'avoid',
                pageBreakInside: 'avoid'
              }}
            >
              <div style={{ marginBottom: '2px' }}>
                <span style={{ fontWeight: 'bold' }}>Beneficiário {index + 1}: </span>
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBeneficiaryBlur(ben.id, 'name', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ textTransform: 'uppercase', fontSize: '9.5pt' }}
                >
                  {ben.name || ''}
                </span>
              </div>
              <div style={{ marginBottom: '2px' }}>
                <span style={{ fontWeight: 'bold' }}>PIX: </span>
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBeneficiaryBlur(ben.id, 'pix', e.currentTarget.textContent || '')}
                  className={editableClass}
                >
                  {ben.pix || ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '2px' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>CPF/CNPJ: </span>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBeneficiaryBlur(ben.id, 'document', e.currentTarget.textContent || '')}
                    className={editableClass}
                  >
                    {ben.document || ''}
                  </span>
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Tipo: </span>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBeneficiaryBlur(ben.id, 'type', e.currentTarget.textContent || '')}
                    className={editableClass}
                  >
                    {ben.type || ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '2px' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Banco: </span>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBeneficiaryBlur(ben.id, 'bank', e.currentTarget.textContent || '')}
                    className={editableClass}
                  >
                    {ben.bank || ''}
                  </span>
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Agência: </span>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBeneficiaryBlur(ben.id, 'agency', e.currentTarget.textContent || '')}
                    className={editableClass}
                  >
                    {ben.agency || ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Conta: </span>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBeneficiaryBlur(ben.id, 'account', e.currentTarget.textContent || '')}
                    className={editableClass}
                  >
                    {ben.account || ''}
                  </span>
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Valor: </span>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBeneficiaryBlur(ben.id, 'amount', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ fontWeight: 'bold', fontSize: '9.5pt' }}
                  >
                    {displayAmount(ben.amount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '10px', textAlign: 'right', fontSize: '8pt', fontStyle: 'italic', opacity: 0.8 }}>
          Data de Emissão: {currentDate}
        </div>
      </div>
    </div>
  );
});

DocumentPreview.displayName = 'DocumentPreview';

export default DocumentPreview;
