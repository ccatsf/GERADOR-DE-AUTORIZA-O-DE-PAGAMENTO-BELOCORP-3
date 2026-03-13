import { findOrCreateFolder, uploadFileToDrive } from './src_services_googleDriveService_Version2';
import React, { useState, useRef, useEffect } from 'react';
import { PaymentAuthData, INITIAL_AUTH_DATA, Beneficiary } from './types';
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
  const [data, setData] = useState<PaymentAuthData>(INITIAL_AUTH_DATA);
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
    const total = data.beneficiaries.reduce((acc, b) => acc + parseCurrency(b.amount), 0);
    const formattedTotal = maskCurrency(Math.round(total * 100).toString());
    
    if (formattedTotal !== data.totalAmount) {
      setData(prev => ({
        ...prev,
        totalAmount: formattedTotal,
        paymentAmount: formattedTotal
      }));
    }
  }, [data.beneficiaries]);

  const handleUpdateData = (newData: Partial<PaymentAuthData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const handleAddBeneficiary = () => {
    setData(prev => ({
      ...prev,
      beneficiaries: [...prev.beneficiaries, { id: crypto.randomUUID(), name: '', pix: '', document: '', type: '', bank: '', agency: '', account: '', amount: '' }]
    }));
  };

  const handleRemoveBeneficiary = (id: string) => {
    setData(prev => ({ ...prev, beneficiaries: prev.beneficiaries.filter(b => b.id !== id) }));
  };

  const handleUpdateBeneficiary = (id: string, updates: Partial<Beneficiary>) => {
    setData(prev => ({ ...prev, beneficiaries: prev.beneficiaries.map(b => (b.id === id ? { ...b, ...updates } : b)) }));
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

      if (!googleToken) {
        throw new Error("Não foi possível obter acesso ao Google Drive.");
      }

      const payload = { ...data, uid: user.uid, updatedAt: serverTimestamp() };

      if (currentDocId) {
        await updateDoc(doc(db, 'authorizations', currentDocId), payload);
      } else {
        const docRef = await addDoc(collection(db, 'authorizations'), { ...payload, createdAt: serverTimestamp() });
        setCurrentDocId(docRef.id);
      }
      
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
    const { id, uid, createdAt, updatedAt, ...docData } = savedDoc;
    setData(docData);
    setCurrentDocId(id);
    setShowHistory(false);
    setShowPreview(false);
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Excluir documento?")) return;
    try {
      await deleteDoc(doc(db, 'authorizations', id));
      if (currentDocId === id) { setCurrentDocId(null); setData(INITIAL_AUTH_DATA); }
      if (user) fetchHistory(user.uid);
    } catch (error) { alert("Erro ao excluir."); }
  };

  const handleAiFill = async (text: string) => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const parsed = await parsePaymentText(text);
      setData(prev => ({
        ...prev, ...parsed,
        beneficiaries: (parsed as any).beneficiaries?.map((b: any, i: number) => ({ ...b, id: prev.beneficiaries[i]?.id || crypto.randomUUID() })) || prev.beneficiaries
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
      id: crypto.randomUUID(),
      name: beneficiary.name,
      pix: beneficiary.pix || '',
      document: beneficiary.document || '',
      type: beneficiary.type || '',
      bank: beneficiary.bank || '',
      agency: beneficiary.agency || '',
      account: beneficiary.account || '',
      amount: ''
    };

    setData(prev => ({
      ...prev,
      beneficiaries: [...prev.beneficiaries, newBeneficiary]
    }));
    setShowDirectory(false);
    alert(`${beneficiary.name} adicionado ao formulário!`);
  };

  const handleDownloadPdf = async (elementId: string, suffix: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    setIsPdfLoading(true);
    try {
      const opt = { margin: 0, filename: `${suffix}_${data.clientName.replace(/\s+/g, '_')}.pdf`, html2canvas: { scale: 3, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      await html2pdf().set(opt).from(element).save();
    } finally { setIsPdfLoading(false); }
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
                  onClick={() => setShowDirectory(true)} 
                  className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition text-sm flex items-center space-x-1"
                  title="Ver base de dados de beneficiários"
                >
                  <i className="fas fa-address-book"></i>
                  <span className="hidden md:inline">Beneficiários</span>
                </button>

                <button onClick={() => setShowHistory(!showHistory)} className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition text-sm flex items-center space-x-1">
                  <i className="fas fa-history"></i>
                  <span>Meus Salvos</span>
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
            <PaymentForm 
              data={data} 
              activeTab={activeTab} 
              onUpdate={handleUpdateData} 
              onAddBeneficiary={handleAddBeneficiary} 
              onRemoveBeneficiary={handleRemoveBeneficiary} 
              onUpdateBeneficiary={handleUpdateBeneficiary} 
            />
          </div>
        ) : (
          <div className="relative">
            {isPdfLoading && <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full"></div></div>}
            <div className="flex justify-center gap-4 mb-4 no-print">
               <button onClick={() => handleDownloadPdf('capa-documento', 'Capa')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow-md flex items-center space-x-2">
                 <i className="fas fa-file-pdf"></i>
                 <span>Baixar Capa</span>
               </button>
               <button onClick={() => handleDownloadPdf('autorizacao-documento', 'Autorizacao')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition shadow-md flex items-center space-x-2">
                 <i className="fas fa-file-invoice-dollar"></i>
                 <span>Baixar Autorização</span>
               </button>
            </div>
            <DocumentPreview data={data} ref={previewRef} onUpdate={handleUpdateData} onUpdateBeneficiary={handleUpdateBeneficiary} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentGenerator;
