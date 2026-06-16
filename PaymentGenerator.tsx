import { findOrCreateFolder, uploadFileToDrive } from './src_services_googleDriveService_Version2';
import React, { useState, useRef, useEffect } from 'react';
import { PaymentAuthData, Beneficiary, normalizePaymentAuthData, createEmptyBeneficiary } from './types';
import { parsePaymentText } from './services/geminiService.ts';
import PaymentForm from './PaymentForm.tsx';
import DocumentPreview from './DocumentPreview.tsx';
import { maskCurrency, parseCurrency } from './formatters.ts';
import { db, googleProvider, auth } from './firebase.ts';
import { User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';

// Declarando html2pdf para o TypeScript
declare var html2pdf: any;

interface PaymentGeneratorProps {
  user: User | null;
  onBack?: () => void;
}

const PaymentGenerator: React.FC<PaymentGeneratorProps> = ({ user, onBack }) => {
  const [data, setData] = useState<PaymentAuthData>(() => normalizePaymentAuthData());
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'auth' | 'cover'>('auth');
  const [savedAuthorizations, setSavedAuthorizations] = useState<any[]>([]);
  const [beneficiariesDirectory, setBeneficiariesDirectory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isQuitacaoMode, setIsQuitacaoMode] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [googleDriveToken, setGoogleDriveToken] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchHistory(user.uid);
      fetchBeneficiariesDirectory();
    } else {
      setSavedAuthorizations([]);
    }
  }, [user]);

  useEffect(() => {
    if (!data) return;
    const beneficiaries = data.beneficiaries ?? [];
    const total = beneficiaries.reduce((acc, b) => acc + parseCurrency(b.amount), 0);
    const formattedTotal = maskCurrency(Math.round(total * 100).toString());
    
    if (formattedTotal !== data.totalAmount) {
      setData(prev => {
        if (!prev) return normalizePaymentAuthData();
        return normalizePaymentAuthData({
          ...prev,
          totalAmount: formattedTotal,
          paymentAmount: formattedTotal
        });
      });
    }
  }, [data?.beneficiaries]);

  const handleUpdateData = (newData: Partial<PaymentAuthData>) => {
    setData(prev => normalizePaymentAuthData({ ...prev, ...newData }));
  };

  const handleAddBeneficiary = () => {
    setData(prev => normalizePaymentAuthData({
      ...prev,
      beneficiaries: [...(prev?.beneficiaries ?? []), createEmptyBeneficiary()]
    }));
  };

  const handleRemoveBeneficiary = (id: string) => {
    setData(prev => normalizePaymentAuthData({
      ...prev,
      beneficiaries: (prev?.beneficiaries ?? []).filter(b => b.id !== id)
    }));
  };

  const handleUpdateBeneficiary = (id: string, updates: Partial<Beneficiary>) => {
    setData(prev => normalizePaymentAuthData({
      ...prev,
      beneficiaries: (prev?.beneficiaries ?? []).map(b => (b.id === id ? { ...b, ...updates } : b))
    }));
  };

  const fetchHistory = async (uid: string) => {
    setIsHistoryLoading(true);
    try {
      const q = query(collection(db, 'authorizations'), where('uid', '==', uid), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setSavedAuthorizations(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } finally { setIsHistoryLoading(false); }
  };

  const fetchBeneficiariesDirectory = async () => {
    try {
      const q = query(collection(db, 'beneficiaries_directory'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      setBeneficiariesDirectory(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Erro ao carregar diretório:", error);
    }
  };
  
  const handleSave = async () => {
    if (!user) { alert("Faça login para salvar."); return; }
    
    setIsSaving(true);
    try {
      const payload = { ...data, uid: user.uid, updatedAt: serverTimestamp(), type: isQuitacaoMode ? 'quitacao' : 'payment' };

      if (currentDocId) {
        await updateDoc(doc(db, 'authorizations', currentDocId), payload);
      } else {
        const docRef = await addDoc(collection(db, 'authorizations'), { ...payload, createdAt: serverTimestamp() });
        setCurrentDocId(docRef.id);
      }

      // Se for Quitação, não salva no Google Drive (conforme solicitado)
      if (isQuitacaoMode) {
        alert("✅ Quitação salva no sistema!");
      } else {
        // Lógica existente para salvar no Drive (apenas para pagamentos normais)
        let googleToken = googleDriveToken;

        if (!googleToken) {
          const provider = new GoogleAuthProvider();
          provider.addScope('https://www.googleapis.com/auth/drive.file');
          const result = await signInWithPopup(auth, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          googleToken = credential?.accessToken || null;
          
          if (googleToken) {
            setGoogleDriveToken(googleToken);
          }
        }

        if (googleToken) {
          const element = document.getElementById('autorizacao-documento');
          
          if (element) {
            const pdfBlob = await html2pdf().set({
              margin: 10,
              filename: `Autorizacao_${data.clientName}.pdf`,
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(element).outputPdf('blob');

            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            let folderId = userDoc.exists() ? userDoc.data().driveFolderId : null;

            if (!folderId) {
              const userEmail = user.email;
              if (!userEmail) throw new Error("E-mail não identificado.");
              folderId = await findOrCreateFolder(userEmail, googleToken);
              await setDoc(userRef, { driveFolderId: folderId }, { merge: true });
            }

            try {
              await uploadFileToDrive(
                `Autorizacao_${data.clientName.replace(/\s+/g, '_')}.pdf`,
                pdfBlob,
                folderId,
                googleToken
              );
            } catch (driveError: any) {
              await uploadFileToDrive(
                `Autorizacao_${data.clientName.replace(/\s+/g, '_')}.pdf`,
                pdfBlob,
                undefined,
                googleToken
              );
            }
            alert("✅ Salvo no sistema e enviado para sua pasta no Google Drive!");
          } else {
            alert("✅ Salvo no sistema! (Abra 'Ver Documento' para enviar ao Drive)");
          }
        } else {
          alert("✅ Salvo no sistema! (Sem acesso ao Google Drive)");
        }
      }

      await fetchHistory(user.uid);

      try {
        const batch = data.beneficiaries.map(async (b) => {
          if (!b.name) return;
          const beneficiaryId = b.document.replace(/\D/g, '') || b.name.toLowerCase().trim().replace(/\s+/g, '_');
          const beneficiaryRef = doc(db, 'beneficiaries_directory', beneficiaryId);
          const { id, amount, ...directoryData } = b;
          await setDoc(beneficiaryRef, {
            ...directoryData,
            updatedAt: serverTimestamp(),
            lastUsedBy: user.uid
          }, { merge: true });
        });
        await Promise.all(batch);
      } catch (err) {
        console.warn("Aviso: Falha ao atualizar diretório de beneficiários:", err);
      }

    } catch (error: any) {
      console.error("Erro no Drive:", error);
      if (error.message?.includes('401') || error.message?.includes('auth') || error.message?.includes('permission')) {
        setGoogleDriveToken(null);
      }
      alert(`Erro ao salvar: ${error.message || "Verifique a conexão com o Google."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDoc = (savedDoc: any) => {
    const { id, uid, createdAt, updatedAt, type, ...docData } = savedDoc;
    setData(normalizePaymentAuthData(docData));
    setCurrentDocId(id);
    setIsQuitacaoMode(type === 'quitacao');
    setShowHistory(false);
    setShowPreview(false);
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Excluir documento?")) return;
    try {
      await deleteDoc(doc(db, 'authorizations', id));
      if (currentDocId === id) { setCurrentDocId(null); setData(normalizePaymentAuthData()); }
      if (user) fetchHistory(user.uid);
    } catch (error) { alert("Erro ao excluir."); }
  };

  const handleAiFill = async (text: string) => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const parsed = await parsePaymentText(text);
      if (!parsed || typeof parsed !== 'object') return;

      setData(prev => normalizePaymentAuthData({
        ...prev,
        ...parsed,
        beneficiaries: Array.isArray((parsed as any).beneficiaries) && (parsed as any).beneficiaries.length > 0
          ? (parsed as any).beneficiaries.map((b: any, i: number) => ({
              ...createEmptyBeneficiary(),
              ...b,
              id: b?.id || prev?.beneficiaries?.[i]?.id || createEmptyBeneficiary().id,
            }))
          : prev?.beneficiaries,
      }));
    } finally { setIsAiLoading(false); }
  };

  const handleDeleteBeneficiary = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Excluir este beneficiário da base de dados?")) return;
    try {
      await deleteDoc(doc(db, 'beneficiaries_directory', id));
      fetchBeneficiariesDirectory();
    } catch (error) {
      alert("Erro ao excluir beneficiário.");
    }
  };

  const handleUseBeneficiary = (beneficiary: any) => {
    const newBeneficiary: Beneficiary = {
      id: Math.random().toString(36).substring(2, 9),
      name: beneficiary.name,
      pix: beneficiary.pix || '',
      document: beneficiary.document || '',
      type: beneficiary.type || '',
      bank: beneficiary.bank || '',
      agency: beneficiary.agency || '',
      account: beneficiary.account || '',
      amount: ''
    };

    setData(prev => normalizePaymentAuthData({
      ...prev,
      beneficiaries: [...(prev?.beneficiaries ?? []), newBeneficiary]
    }));
    setShowDirectory(false);
    alert(`${beneficiary.name} adicionado ao formulário!`);
  };

  const handleDownloadPdf = async (elementId: string, suffix: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      alert('Documento não encontrado. Tente recarregar a página.');
      return;
    }
    setIsPdfLoading(true);
    try {
      const opt = {
        margin: 0,
        filename: `${suffix}_${data.clientName.replace(/\s+/g, '_')}.pdf`,
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      };
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="pb-20 transition-colors duration-300">
      <nav className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b dark:border-zinc-800 p-6 sticky top-[-32px] lg:top-[-48px] -mx-8 lg:-mx-12 -mt-8 lg:-mt-12 z-50 no-print mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-6">
            {onBack && (
              <button 
                onClick={onBack}
                className="text-gray-400 hover:text-indigo-500 transition-colors p-2 -ml-2"
                title="Voltar ao Dashboard"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
            )}
            <div className="flex items-center space-x-2">
              <i className="fas fa-file-invoice-dollar text-2xl text-indigo-600"></i>
              <h1 className="text-xl font-bold tracking-tight dark:text-white">Gerador</h1>
            </div>
            {user && (
              <div className="flex items-center space-x-3 no-print">
                <button 
                  onClick={() => { setShowDirectory(false); setShowHistory(false); setIsQuitacaoMode(false); }} 
                  className={`text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition text-sm flex items-center space-x-1 ${!isQuitacaoMode && !showDirectory && !showHistory ? 'text-indigo-600 font-bold border-b-2 border-indigo-600' : ''}`}
                >
                  <i className="fas fa-file-invoice-dollar"></i>
                  <span>Gerador</span>
                </button>

                <button 
                  onClick={() => { setShowDirectory(true); setShowHistory(false); setIsQuitacaoMode(false); }} 
                  className={`text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition text-sm flex items-center space-x-1 ${showDirectory ? 'text-indigo-600 font-bold border-b-2 border-indigo-600' : ''}`}
                  title="Ver base de dados de beneficiários"
                >
                  <i className="fas fa-address-book"></i>
                  <span className="hidden md:inline">Beneficiários</span>
                </button>

                <button 
                  onClick={() => { setShowHistory(!showHistory); setShowDirectory(false); setIsQuitacaoMode(false); }} 
                  className={`text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition text-sm flex items-center space-x-1 ${showHistory ? 'text-indigo-600 font-bold border-b-2 border-indigo-600' : ''}`}
                >
                  <i className="fas fa-history"></i>
                  <span>Meus Salvos</span>
                </button>

                <button 
                  onClick={() => { setIsQuitacaoMode(true); setShowDirectory(false); setShowHistory(false); }} 
                  className={`text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition text-sm flex items-center space-x-1 ${isQuitacaoMode ? 'text-indigo-600 font-bold border-b-2 border-indigo-600' : ''}`}
                >
                  <i className="fas fa-check-double"></i>
                  <span>Quitação</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 items-center">
            {user && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition font-medium flex items-center space-x-2 ${isSaving ? 'opacity-70' : ''}`}
              >
                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                <span>{currentDocId ? 'Atualizar' : 'Salvar'}</span>
              </button>
            )}

            <button onClick={() => setShowPreview(!showPreview)} className="bg-gray-200 hover:bg-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg transition font-medium flex items-center space-x-2">
              <i className={`fas ${showPreview ? 'fa-edit' : 'fa-eye'}`}></i>
              <span>{showPreview ? 'Editar Dados' : 'Ver Documento'}</span>
            </button>
          </div>
        </div>
      </nav>

      <div className={`${showPreview ? '' : 'max-w-5xl mx-auto px-4'}`}>
        {showHistory && user && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex justify-end no-print" onClick={() => setShowHistory(false)}>
            <div className="bg-white dark:bg-zinc-800 w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-6 border-b pb-4 dark:text-white">Documentos Salvos</h2>
              <div className="space-y-3">
                {savedAuthorizations.map((doc) => (
                  <div key={doc.id} onClick={() => handleLoadDoc(doc)} className="p-4 rounded-xl border dark:border-zinc-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold dark:text-white">{doc.clientName}</h3>
                      <p className="text-xs text-gray-500">{doc.totalAmount}</p>
                    </div>
                    <button onClick={(e) => handleDeleteDoc(doc.id, e)} className="text-red-400 hover:text-red-600"><i className="fas fa-trash-alt"></i></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showDirectory && user && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex justify-center items-center p-4 no-print" onClick={() => setShowDirectory(false)}>
            <div className="bg-white dark:bg-zinc-800 w-full max-w-4xl max-h-[90vh] shadow-2xl rounded-2xl p-6 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-zinc-700">
                <h2 className="text-xl font-bold dark:text-white flex items-center">
                  <i className="fas fa-address-book mr-3 text-indigo-500"></i>
                  Base de Dados de Beneficiários
                </h2>
                <button onClick={() => setShowDirectory(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {beneficiariesDirectory.length > 0 ? (
                    beneficiariesDirectory.map((b) => (
                      <div 
                        key={b.id} 
                        className="p-4 rounded-xl border dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800 dark:text-white uppercase text-sm">{b.name}</h3>
                            <p className="text-[10px] text-indigo-500 font-bold">{b.document}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleUseBeneficiary(b)}
                              className="text-indigo-500 hover:text-indigo-600 p-1 bg-white dark:bg-zinc-800 rounded shadow-sm"
                              title="Adicionar ao formulário"
                            >
                              <i className="fas fa-plus"></i>
                            </button>
                            <button 
                              onClick={(e) => handleDeleteBeneficiary(b.id, e)} 
                              className="text-red-400 hover:text-red-600 p-1 bg-white dark:bg-zinc-800 rounded shadow-sm"
                              title="Excluir da base"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-zinc-400">
                          <div><span className="font-semibold">Banco:</span> {b.bank}</div>
                          <div><span className="font-semibold">Tipo:</span> {b.type}</div>
                          <div><span className="font-semibold">Ag:</span> {b.agency}</div>
                          <div><span className="font-semibold">CC:</span> {b.account}</div>
                          <div className="col-span-2 mt-1 truncate"><span className="font-semibold">PIX:</span> {b.pix}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-10 text-gray-400">
                      Nenhum beneficiário salvo na base de dados ainda.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!showPreview ? (
          <div className="space-y-6">
            {!isQuitacaoMode && (
              <section className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border dark:border-zinc-700">
                <div className="flex items-center space-x-2 mb-4">
                  <i className="fas fa-magic text-indigo-500"></i>
                  <h2 className="font-semibold dark:text-white">Preenchimento Inteligente (IA)</h2>
                </div>
                <textarea 
                  placeholder="Cole aqui o texto do pagamento (e-mail, whatsapp, etc) para a IA preencher o formulário automaticamente..." 
                  className="w-full h-24 p-4 border dark:border-zinc-700 dark:bg-zinc-900 rounded-lg outline-none dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all" 
                  onBlur={(e) => handleAiFill(e.target.value)}
                ></textarea>
                {isAiLoading && <p className="text-xs text-indigo-500 mt-2 flex items-center"><i className="fas fa-spinner fa-spin mr-2"></i> Processando com IA...</p>}
              </section>
            )}

            {isQuitacaoMode ? (
              <div className="animate-fadeIn">
                <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-sm border dark:border-zinc-700">
                  <div className="flex items-center space-x-3 mb-8 pb-4 border-b dark:border-zinc-700">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <i className="fas fa-check-double text-2xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold dark:text-white uppercase tracking-tight">Formulário de Quitação</h2>
                      <p className="text-sm text-gray-500 dark:text-zinc-400">Preencha os dados para gerar o documento de quitação</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Dados do Cliente</h3>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Nome do Cliente</label>
                        <input 
                          type="text" 
                          value={data.clientName} 
                          onChange={(e) => handleUpdateData({ clientName: e.target.value })}
                          className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">CPF</label>
                        <input 
                          type="text" 
                          value={data.clientCpf} 
                          onChange={(e) => handleUpdateData({ clientCpf: e.target.value })}
                          className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Contrato nº</label>
                          <input 
                            type="text" 
                            value={data.contractNumber} 
                            onChange={(e) => handleUpdateData({ contractNumber: e.target.value })}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                            placeholder="Ex: 326105"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Valor a Receber (R$)</label>
                          <input 
                            type="text" 
                            value={data.totalAmount} 
                            onChange={(e) => handleUpdateData({ totalAmount: maskCurrency(e.target.value) })}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                            placeholder="R$ 0,00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Plano Quitado Em</label>
                        <input 
                          type="date" 
                          value={data.quitacaoDate || ''} 
                          onChange={(e) => handleUpdateData({ quitacaoDate: e.target.value })}
                          className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Dados Bancários</h3>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Beneficiário</label>
                        <input 
                          type="text" 
                          value={data.beneficiaries[0]?.name || ''} 
                          onChange={(e) => handleUpdateBeneficiary(data.beneficiaries[0]?.id, { name: e.target.value })}
                          className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                          placeholder="Nome do beneficiário"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">CPF/CNPJ</label>
                        <input 
                          type="text" 
                          value={data.beneficiaries[0]?.document || ''} 
                          onChange={(e) => handleUpdateBeneficiary(data.beneficiaries[0]?.id, { document: e.target.value })}
                          className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                          placeholder="00.000.000/0001-00"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Banco</label>
                          <input 
                            type="text" 
                            value={data.beneficiaries[0]?.bank || ''} 
                            onChange={(e) => handleUpdateBeneficiary(data.beneficiaries[0]?.id, { bank: e.target.value })}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Tipo de Conta</label>
                          <input 
                            type="text" 
                            value={data.beneficiaries[0]?.type || ''} 
                            onChange={(e) => handleUpdateBeneficiary(data.beneficiaries[0]?.id, { type: e.target.value })}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                            placeholder="Corrente / Poupança"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Agência</label>
                          <input 
                            type="text" 
                            value={data.beneficiaries[0]?.agency || ''} 
                            onChange={(e) => handleUpdateBeneficiary(data.beneficiaries[0]?.id, { agency: e.target.value })}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">Conta</label>
                          <input 
                            type="text" 
                            value={data.beneficiaries[0]?.account || ''} 
                            onChange={(e) => handleUpdateBeneficiary(data.beneficiaries[0]?.id, { account: e.target.value })}
                            className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2 uppercase">PIX</label>
                        <input 
                          type="text" 
                          value={data.beneficiaries[0]?.pix || ''} 
                          onChange={(e) => handleUpdateBeneficiary(data.beneficiaries[0]?.id, { pix: e.target.value })}
                          className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                          placeholder="Chave PIX"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <PaymentForm 
                data={data} 
                activeTab={activeTab} 
                onUpdate={handleUpdateData} 
                onAddBeneficiary={handleAddBeneficiary} 
                onRemoveBeneficiary={handleRemoveBeneficiary} 
                onUpdateBeneficiary={handleUpdateBeneficiary} 
              />
            )}
          </div>
        ) : (
          <div className="relative">
            {isPdfLoading && <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full"></div></div>}
            <div className="relative z-10 flex justify-center gap-4 mb-4 no-print">
               {!isQuitacaoMode ? (
                 <>
                   <button onClick={() => handleDownloadPdf('capa-documento', 'Capa')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow-md flex items-center space-x-2">
                     <i className="fas fa-file-pdf"></i>
                     <span>Baixar Capa</span>
                   </button>
                   <button onClick={() => handleDownloadPdf('autorizacao-documento', 'Autorizacao')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition shadow-md flex items-center space-x-2">
                     <i className="fas fa-file-invoice-dollar"></i>
                     <span>Baixar Autorização</span>
                   </button>
                 </>
               ) : (
                 <button onClick={() => handleDownloadPdf('quitacao-documento', 'Quitacao')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition shadow-lg flex items-center space-x-3 font-bold">
                   <i className="fas fa-file-pdf text-xl"></i>
                   <span>Baixar Documento de Quitação</span>
                 </button>
               )}
            </div>
            <DocumentPreview 
              data={data} 
              ref={previewRef} 
              isQuitacaoMode={isQuitacaoMode}
              onUpdate={handleUpdateData} 
              onUpdateBeneficiary={handleUpdateBeneficiary} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentGenerator;
