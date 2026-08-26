import React, { forwardRef } from 'react';
import { PaymentAuthData, Beneficiary } from './types';

interface Props {
  data: PaymentAuthData;
  isQuitacaoMode?: boolean;
  onUpdate?: (data: Partial<PaymentAuthData>) => void;
  onUpdateBeneficiary?: (id: string, updates: Partial<Beneficiary>) => void;
}

const DocumentPreview = forwardRef<HTMLDivElement, Props>(({ data, isQuitacaoMode, onUpdate, onUpdateBeneficiary }, ref) => {
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

  const [checklistAdmin, setChecklistAdmin] = React.useState([
    'Nota promissória preenchida corretamente?',
    'Documentação do cliente anexado em sistema?',
    'Documentação do Avalista?',
    'Laudo médico?',
    'Autorização de pagamento Belomotors',
    'Orçamento Belocred'
  ]);

  const [checklistFinanceiro, setChecklistFinanceiro] = React.useState([
    'Nome/Razão social confere com autorização?',
    'Dados bancários completos?',
    'Valor digitado confere com documento e sistema?',
    'Documento legível (sem corte e borrão)?',
    'Pagamento registrado no sistema Houster?',
    'Lançamento no drive?'
  ]);

  const handleChecklistAdminBlur = (index: number, value: string) => {
    const newChecklist = [...checklistAdmin];
    newChecklist[index] = value;
    setChecklistAdmin(newChecklist);
  };

  const handleChecklistFinanceiroBlur = (index: number, value: string) => {
    const newChecklist = [...checklistFinanceiro];
    newChecklist[index] = value;
    setChecklistFinanceiro(newChecklist);
  };

  // Tamanho 14pt para a Capa (conforme solicitado para manter)
  const fontSizeCapa = { fontSize: '14pt' };
  
  // Tamanho reduzido para a Autorização (conforme solicitado para diminuir)
  const fontSizeAuthBody = { fontSize: '11pt' };
  const fontSizeAuthHeader = { fontSize: '12pt' };

  const editableClass = "hover:bg-blue-50 focus:bg-blue-100 outline-none transition-colors cursor-text rounded";

  // Função para agrupar beneficiários em páginas (5 por página)
  const groupBeneficiariesByPage = (beneficiaries: Beneficiary[], perPage: number = 5) => {
    const pages = [];
    for (let i = 0; i < beneficiaries.length; i += perPage) {
      pages.push(beneficiaries.slice(i, i + perPage));
    }
    return pages;
  };

  const beneficiaries = data?.beneficiaries ?? [];
  const beneficiaryPages = groupBeneficiariesByPage(beneficiaries);

  return (
    <div className="a4-preview-wrapper flex flex-col items-center space-y-12 pb-20">
      <div className="no-print bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-4 py-2 rounded-full text-xs font-bold shadow-sm flex items-center space-x-2 animate-bounce">
        <i className="fas fa-info-circle"></i>
        <span>Dica: Você pode clicar e editar os textos diretamente no documento abaixo!</span>
      </div>

      {!isQuitacaoMode && (
        <>
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
                <h1 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('capaTitle1', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '1px' }}
                >
                  {data.capaTitle1 || 'AUTORIZAÇÃO DE PAGAMENTO'}
                </h1>
                <h1 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('capaTitle2', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontSize: '16pt', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}
                >
                  {data.capaTitle2 || 'BELOGROUP'}
                </h1>
              </div>

              <div style={{ borderBottom: '2px solid black', marginBottom: '15px' }}></div>

              {/* Mantido 14pt na Capa */}
              <div style={{ marginBottom: '20px', lineHeight: '1.5', ...fontSizeCapa }}>
                <p style={{ margin: '6px 0' }}>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('capaLabel1', e.currentTarget.textContent || '')}
                    className={editableClass}
                  >
                    {data.capaLabel1 || 'Cliente:'}
                  </span>
                  &nbsp;
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
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('capaLabel2', e.currentTarget.textContent || '')}
                    className={editableClass}
                  >
                    {data.capaLabel2 || 'CPF:'}
                  </span>
                  &nbsp;
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
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('capaLabel3', e.currentTarget.textContent || '')}
                    className={editableClass}
                  >
                    {data.capaLabel3 || 'Valor do plano:'}
                  </span>
                  &nbsp;
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
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('capaLabel4', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ marginRight: '12px' }}
                  >
                    {data.capaLabel4 || 'Contrato aditivo?'}
                  </span>
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
                    <span 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => handleBlur('capaLabel5', e.currentTarget.textContent || '')}
                      className={editableClass}
                      style={{ marginRight: '4px' }}
                    >
                      {data.capaLabel5 || 'Valor a pagar:'}
                    </span>
                    &nbsp;
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
                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
  <span 
    contentEditable 
    suppressContentEditableWarning
    onBlur={(e) => handleBlur('capaLabelPagamento', e.currentTarget.textContent || '')}
    className={editableClass}
    style={{ marginRight: '12px' }}
  >
    {data.capaLabelPagamento || 'Previsão de pagamento:'}
  </span>

  <span 
    contentEditable 
    suppressContentEditableWarning
    onBlur={(e) => handleBlur('paymentForecast', e.currentTarget.textContent || '')}
    className={editableClass}
    style={{ fontWeight: 'bold', minWidth: '100px', display: 'inline-block' }}
  >
    {data.paymentForecast || '__/__/____'}
  </span>
</div>

<div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
  <span 
    contentEditable 
    suppressContentEditableWarning
    onBlur={(e) => handleBlur('capaLabel6', e.currentTarget.textContent || '')}
    className={editableClass}
    style={{ marginRight: '12px' }}
  >
    {data.capaLabel6 || 'Necessidade de avalista?'}
  </span>
                

                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('capaLabel6', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ marginRight: '12px' }}
                  >
                    {data.capaLabel6 || 'Necessidade de avalista?'}
                  </span>
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
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('capaLabel7', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ marginRight: '10px', whiteSpace: 'nowrap' }}
                  >
                    {data.capaLabel7 || 'Médico (a):'}
                  </span>
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
                <h3 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('checklistAdminTitle', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontSize: '13pt', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase' }}
                >
                  {data.checklistAdminTitle || 'CHECKLIST ADMINISTRATIVO:'}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {checklistAdmin.map((item, i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11.5pt', paddingLeft: '15px' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '12px' }}>•</span>
                        <span 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleChecklistAdminBlur(i, e.currentTarget.textContent || '')}
                          className={editableClass}
                        >
                          {item}
                        </span>
                      </span>
                      <span style={{ fontWeight: 'normal', cursor: 'pointer' }} className="hover:text-blue-600">( &nbsp;&nbsp;&nbsp;&nbsp; )</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('checklistFinanceiroTitle', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontSize: '13pt', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase' }}
                >
                  {data.checklistFinanceiroTitle || 'CHECKLIST FINANCEIRO:'}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {checklistFinanceiro.map((item, i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11.5pt', paddingLeft: '15px' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '12px' }}>•</span>
                        <span 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleChecklistFinanceiroBlur(i, e.currentTarget.textContent || '')}
                          className={editableClass}
                        >
                          {item}
                        </span>
                      </span>
                      <span style={{ fontWeight: 'normal', cursor: 'pointer' }} className="hover:text-blue-600">( &nbsp;&nbsp;&nbsp;&nbsp; )</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ borderBottom: '2px solid black', marginTop: 'auto', marginBottom: '0' }}></div>
            </div>
          </div>

          {/* PÁGINAS DE AUTORIZAÇÃO - UMA POR PÁGINA (MAX 5 BENEFICIÁRIOS POR PÁGINA) */}
          <div id="autorizacao-documento" className="flex flex-col items-center space-y-12 w-full">
          {beneficiaryPages.map((pagebeneficiaries, pageIndex) => (
            <div
              key={pageIndex}
              id={`autorizacao-documento-${pageIndex}`}
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
              {pageIndex === 0 && (
                <>
                  <div style={{ border: '2px solid black', padding: '10px', marginBottom: '15px' }}>
                    <h2 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => handleBlur('authTitle', e.currentTarget.textContent || '')}
                      className={editableClass}
                      style={{ ...fontSizeAuthHeader, fontWeight: 'bold', margin: 0, textAlign: 'center', textTransform: 'uppercase' }}
                    >
                      {data.authTitle || 'AUTORIZAÇÃO DE PAGAMENTO – CLIENTE'}
                    </h2>
                  </div>

                  {/* Parágrafo principal - COMPLETAMENTE EDITÁVEL */}
                  <div style={{ 
                    border: '2px solid black', 
                    padding: '15px', 
                    marginBottom: '15px', 
                    ...fontSizeAuthBody, 
                    lineHeight: '1.5', 
                    textAlign: 'left',
                    backgroundColor: 'white'
                  }}>
                    <p 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => handleBlur('authParagraph', e.currentTarget.textContent || '')}
                      className={editableClass}
                      style={{ margin: 0, wordBreak: 'normal', whiteSpace: 'normal' }}
                    >
                      {data.authParagraph || `EU, ${data.clientName || '__________________________________________________'}, PORTADOR (A) DO CPF: ${data.clientCpf || '__________________'}, AUTORIZO A EMPRESA BELOGROUP INTERMEDIADORA DE SERVIÇOS LTDA – CNPJ: 27.246.092/0001-40 A UTILIZAR O CRÉDITO REFERENTE AO MEU CONTRATO N°. ${data.contractNumber || '__________'} PARA EFETUAR O PAGAMENTO PARA OS SEGUINTES BENEFICIÁRIOS:`}
                    </p>
                  </div>

                  {/* Valor Total — entre o parágrafo e os beneficiários */}
                  <div style={{ border: '1px solid black', padding: '6px 10px', marginBottom: '8px', ...fontSizeAuthBody }}>
                    <span 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => handleBlur('valorTotalLabel', e.currentTarget.textContent || '')}
                      className={editableClass}
                      style={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                      {data.valorTotalLabel || 'Valor Total:'}
                    </span>
                    &nbsp;
                    <span style={{ fontWeight: 'bold' }}>{displayAmount(data.totalAmount)}</span>
                  </div>
                </>
              )}

              {pageIndex > 0 && (
                <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '10pt', fontStyle: 'italic', color: '#666' }}>
                  (Continuação - Beneficiários {pageIndex * 5 + 1} ao {Math.min((pageIndex + 1) * 5, beneficiaries.length)})
                </div>
              )}

              <div style={{ ...fontSizeAuthBody, flex: 1 }}>
                {pagebeneficiaries.map((ben, indexInPage) => {
                  const globalIndex = pageIndex * 5 + indexInPage;
                  return (
                    <div key={ben.id} style={{ border: '1px solid black', padding: '6px 10px', marginBottom: '6px', backgroundColor: 'white' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', borderBottom: '1px dashed #ccc', paddingBottom: '2px', marginBottom: '2px' }}>
                        <span 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleBlur('beneficiaryLabel', e.currentTarget.textContent || '')}
                          className={editableClass}
                          style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
                        >
                          {data.beneficiaryLabel || `Beneficiário ${globalIndex + 1}:`}
                        </span>
                        <span 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleBeneficiaryBlur(ben.id, 'name', e.currentTarget.textContent || '')}
                          className={editableClass}
                          style={{ textTransform: 'uppercase', fontWeight: 'bold', marginLeft: '4px' }}
                        >
                          {ben.name || '_________________________'}
                        </span>
                      </div>
                      <div style={{ marginBottom: '1px' }}>
                        <span 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleBlur('pixLabel', e.currentTarget.textContent || '')}
                          className={editableClass}
                          style={{ fontWeight: 'bold' }}
                        >
                          {data.pixLabel || 'PIX:'}
                        </span>
                        &nbsp;
                        <span 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleBeneficiaryBlur(ben.id, 'pix', e.currentTarget.textContent || '')}
                          className={editableClass}
                        >
                          {ben.pix || ''}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '1px' }}>
                        <div>
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleBlur('docLabel', e.currentTarget.textContent || '')}
                            className={editableClass}
                            style={{ fontWeight: 'bold' }}
                          >
                            {data.docLabel || 'CPF/CNPJ:'}
                          </span>
                          &nbsp;
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
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleBlur('typeLabel', e.currentTarget.textContent || '')}
                            className={editableClass}
                            style={{ fontWeight: 'bold' }}
                          >
                            {data.typeLabel || 'Tipo:'}
                          </span>
                          &nbsp;
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '1px' }}>
                        <div>
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleBlur('bankLabel', e.currentTarget.textContent || '')}
                            className={editableClass}
                            style={{ fontWeight: 'bold' }}
                          >
                            {data.bankLabel || 'Banco:'}
                          </span>
                          &nbsp;
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
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleBlur('agencyLabel', e.currentTarget.textContent || '')}
                            className={editableClass}
                            style={{ fontWeight: 'bold' }}
                          >
                            {data.agencyLabel || 'Agência:'}
                          </span>
                          &nbsp;
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        <div>
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleBlur('accountLabel', e.currentTarget.textContent || '')}
                            className={editableClass}
                            style={{ fontWeight: 'bold' }}
                          >
                            {data.accountLabel || 'Conta:'}
                          </span>
                          &nbsp;
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
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleBlur('amountLabel', e.currentTarget.textContent || '')}
                            className={editableClass}
                            style={{ fontWeight: 'bold' }}
                          >
                            {data.amountLabel || 'Valor:'}
                          </span>
                          &nbsp;
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleBeneficiaryBlur(ben.id, 'amount', e.currentTarget.textContent || '')} 
                            className={editableClass}
                          >
                            {ben.amount || ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '10px', textAlign: 'right', fontSize: '8pt', fontStyle: 'italic', opacity: 0.8 }}>
                Data de Emissão: {currentDate}
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* PÁGINA QUITAÇÃO */}
      {isQuitacaoMode && (
        <div
          id="quitacao-documento"
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
          <div style={{ border: '2px solid black', padding: '15px', textAlign: 'center', marginBottom: '0px' }}>
             <h2 
               contentEditable 
               suppressContentEditableWarning
               onBlur={(e) => handleBlur('quitacaoTitle1', e.currentTarget.textContent || '')}
               className={editableClass}
               style={{ fontSize: '14pt', fontWeight: 'bold', margin: 0, letterSpacing: '2px' }}
             >
               {data.quitacaoTitle1 || 'AUTORIZAÇÃO DE PAGAMENTO'}
             </h2>
             <h1 
               contentEditable 
               suppressContentEditableWarning
               onBlur={(e) => handleBlur('quitacaoTitle2', e.currentTarget.textContent || '')}
               className={editableClass}
               style={{ fontSize: '32pt', fontWeight: 'bold', margin: '10px 0' }}
             >
               {data.quitacaoTitle2 || 'QUITAÇÃO'}
             </h1>
             <p 
               contentEditable 
               suppressContentEditableWarning
               onBlur={(e) => handleBlur('quitacaoSubtitle', e.currentTarget.textContent || '')}
               className={editableClass}
               style={{ fontSize: '10pt', margin: 0 }}
             >
               {data.quitacaoSubtitle || '(Uso Interno)'}
             </p>
          </div>
          
          <div style={{ border: '2px solid black', borderTop: 'none', padding: '30px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '1px solid black', paddingBottom: '10px' }}>
              <h3 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => handleBlur('quitacaoSubheader', e.currentTarget.textContent || '')}
                className={editableClass}
                style={{ fontSize: '14pt', fontWeight: 'bold' }}
              >
                {data.quitacaoSubheader || 'BELOGROUP – PLANOS PROGRAMADOS'}
              </h3>
            </div>

            <div style={{ fontSize: '13pt', lineHeight: '2.5', marginBottom: '40px' }}>
              <p>
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('quitacaoClientLabel', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontWeight: 'bold' }}
                >
                  {data.quitacaoClientLabel || 'Nome Cliente:'}
                </span>
                &nbsp;
                <span 
                  style={{ fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #eee', display: 'inline-block', minWidth: '300px' }}
                >
                  {data.clientName}
                </span>
              </p>
              <p>
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('quitacaoCpfLabel', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontWeight: 'bold' }}
                >
                  {data.quitacaoCpfLabel || 'CPF:'}
                </span>
                &nbsp;
                <span style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', display: 'inline-block', minWidth: '200px' }}>
                  {data.clientCpf}
                </span>
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('quitacaoContractLabel', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ fontWeight: 'bold' }}
                  >
                    {data.quitacaoContractLabel || 'Contrato nº:'}
                  </span>
                  &nbsp;
                  <span style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', display: 'inline-block', minWidth: '100px' }}>
                    {data.contractNumber}
                  </span>
                </p>
                <p>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('quitacaoAmountLabel', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ fontWeight: 'bold' }}
                  >
                    {data.quitacaoAmountLabel || 'Valor a receber:'}
                  </span>
                  &nbsp;
                  <span style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', display: 'inline-block', minWidth: '150px' }}>
                    {displayAmount(data.totalAmount)}
                  </span>
                </p>
              </div>
              <p>
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('quitacaoDateLabel', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontWeight: 'bold' }}
                >
                  {data.quitacaoDateLabel || 'Plano quitado em:'}
                </span>
                &nbsp;
                <span style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', display: 'inline-block', minWidth: '150px' }}>
                  {data.quitacaoDate ? new Date(data.quitacaoDate).toLocaleDateString('pt-BR') : '__/__/____'}
                </span>
              </p>
            </div>

            <div style={{ marginTop: '20px', border: '1px solid black', padding: '25px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '0 15px' }}>
                <h3 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => handleBlur('quitacaoBankDataTitle', e.currentTarget.textContent || '')}
                  className={editableClass}
                  style={{ fontSize: '14pt', fontWeight: 'bold' }}
                >
                  {data.quitacaoBankDataTitle || 'DADOS BANCÁRIOS'}
                </h3>
              </div>
              
              <div style={{ fontSize: '12pt', lineHeight: '2' }}>
                <p>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('quitacaoBeneficiaryLabel', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ fontWeight: 'bold' }}
                  >
                    {data.quitacaoBeneficiaryLabel || 'Beneficiário:'}
                  </span>
                  &nbsp;
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {beneficiaries[0]?.name || '________________________________'}
                  </span>
                </p>
                <p>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('quitacaoDocLabel', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ fontWeight: 'bold' }}
                  >
                    {data.quitacaoDocLabel || 'CPF/CNPJ:'}
                  </span>
                  &nbsp;
                  <span style={{ fontWeight: 'bold' }}>
                    {beneficiaries[0]?.document || '__________________'}
                  </span>
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <p>
                    <span 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => handleBlur('quitacaoBankLabel', e.currentTarget.textContent || '')}
                      className={editableClass}
                      style={{ fontWeight: 'bold' }}
                    >
                      {data.quitacaoBankLabel || 'Banco:'}
                    </span>
                    &nbsp;
                    <span style={{ fontWeight: 'bold' }}>
                      {beneficiaries[0]?.bank || '________________'}
                    </span>
                  </p>
                  <p>
                    <span 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => handleBlur('quitacaoAgencyLabel', e.currentTarget.textContent || '')}
                      className={editableClass}
                      style={{ fontWeight: 'bold' }}
                    >
                      {data.quitacaoAgencyLabel || 'Agencia:'}
                    </span>
                    &nbsp;
                    <span style={{ fontWeight: 'bold' }}>
                      {beneficiaries[0]?.agency || '________________'}
                    </span>
                  </p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <p>
                    <span 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => handleBlur('quitacaoAccountLabel', e.currentTarget.textContent || '')}
                      className={editableClass}
                      style={{ fontWeight: 'bold' }}
                    >
                      {data.quitacaoAccountLabel || 'Conta:'}
                    </span>
                    &nbsp;
                    <span style={{ fontWeight: 'bold' }}>
                      {beneficiaries[0]?.account || '________________'}
                    </span>
                  </p>
                  <p>
                    <span 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => handleBlur('quitacaoTypeLabel', e.currentTarget.textContent || '')}
                      className={editableClass}
                      style={{ fontWeight: 'bold' }}
                    >
                      {data.quitacaoTypeLabel || 'Tipo:'}
                    </span>
                    &nbsp;
                    <span style={{ fontWeight: 'bold' }}>
                      {beneficiaries[0]?.type || '________________'}
                    </span>
                  </p>
                </div>
                
                <p>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => handleBlur('quitacaoPixLabel', e.currentTarget.textContent || '')}
                    className={editableClass}
                    style={{ fontWeight: 'bold' }}
                  >
                    {data.quitacaoPixLabel || 'PIX:'}
                  </span>
                  &nbsp;
                  <span style={{ fontWeight: 'bold' }}>
                    {beneficiaries[0]?.pix || '________________________________'}
                  </span>
                </p>
              </div>
            </div>

            <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '10pt', color: '#666' }}>
              Documento gerado em {currentDate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DocumentPreview.displayName = 'DocumentPreview';

export default DocumentPreview;
