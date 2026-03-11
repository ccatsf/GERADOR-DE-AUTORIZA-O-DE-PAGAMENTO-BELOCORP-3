import { uploadFileToDrive } from './src_services_googleDriveService_Version2';import React, { useState, useRef, useEffect } from 'react';
import { PaymentAuthData, INITIAL_AUTH_DATA, Beneficiary } from './types';
import { parsePaymentText } from './services/geminiService.ts';
import PaymentForm from './PaymentForm.tsx';
import DocumentPreview from './DocumentPreview.tsx';
import { maskCurrency, parseCurrency } from './formatters.ts';
import { auth, db, googleProvider } from './firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
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
  getDocFromServer
} from 'firebase/firestore';

// Declarando html2pdf para o TypeScript
declare var html2pdf: any;

const App: React.FC = () => {
  const [data, setData] = useState<PaymentAuthData>(INITIAL_AUTH_DATA);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'auth' | 'cover'>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [savedAuthorizations, setSavedAuthorizations] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const previewRef = useRef<HTMLDivElement>(null);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Test connection to Firestore
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchHistory(currentUser.uid);
      } else {
        setSavedAuthorizations([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Efeito para somar automaticamente os valores dos beneficiários
  useEffect(() => {
    const total = data.beneficiaries.reduce((acc, b) => {
      return acc + parseCurrency(b.amount);
    }, 0);

    const formattedTotal = maskCurrency(Math.round(total * 100).toString());
    
    if (formattedTotal !== data.totalAmount) {
      setData(prev => ({
        ...prev,
        totalAmount: formattedTotal,
        paymentAmount: formattedTotal // Sincroniza também o valor da capa
      }));
    }
  }, [data.beneficiaries]);

  const handleUpdateData = (newData: Partial<PaymentAuthData>) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      // Se atualizar o totalAmount e o paymentAmount estiver vazio, sincroniza
      if (newData.totalAmount && !prev.paymentAmount) {
        updated.paymentAmount = newData.totalAmount;
      }
      return updated;
    });
  };

  const handleAddBeneficiary = () => {
    setData(prev => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        {
          id: crypto.randomUUID(),
          name: '',
          pix: '',
          document: '',
          type: '',
          bank: '',
          agency: '',
          account: '',
          amount: '',
        }
      ]
    }));
  };

  const handleRemoveBeneficiary = (id: string) => {
    setData(prev => ({
      ...prev,
      beneficiaries: prev.beneficiaries.filter(b => b.id !== id)
    }));
  };

  const handleUpdateBeneficiary = (id: string, updates: Partial<Beneficiary>) => {
    setData(prev => ({
      ...prev,
      beneficiaries: prev.beneficiaries.map(b => (b.id === id ? { ...b, ...updates } : b))
    }));
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      alert("Falha na autenticação com Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentDocId(null);
      setData(INITIAL_AUTH_DATA);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const fetchHistory = async (uid: string) => {
    setIsHistoryLoading(true);
    try {
      console.log("🔍 Buscando documentos para UID:", uid);
      
      const q = query(
        collection(db, 'authorizations'),
        where('uid', '==', uid),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      console.log("📊 Total de documentos encontrados:", querySnapshot.size);
      
      const docs = querySnapshot.docs.map(doc => {
  const data = doc.data();
  console.log("📄 Documento:", {
    id: doc.id,
    clientName: data.clientName,
    uid: data.uid,
    updatedAt: data.updatedAt
  });
  return {
    id: doc.id,
    ...data
  };
});
      
      setSavedAuthorizations(docs);
      console.log("✅ Estado atualizado com", docs.length, "documentos");
    } catch (error) {
      console.error("❌ ERRO ao buscar histórico:", error);
      if (error instanceof Error) {
        console.error("Mensagem:", error.message);
      }
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      alert("Você precisa estar logado para salvar.");
      return;
    }

    if (!data.clientName.trim()) {
      alert("O nome do cliente é obrigatório para salvar.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...data,
        uid: user.uid,
        updatedAt: serverTimestamp()
      };

      console.log("📝 Tentando salvar com payload:", payload);
      console.log("👤 User ID:", user.uid);

      if (currentDocId) {
        await updateDoc(doc(db, 'authorizations', currentDocId), payload);
        console.log("✅ Documento atualizado:", currentDocId);
      } else {
        const docRef = await addDoc(collection(db, 'authorizations'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        console.log("✅ Novo documento criado:", docRef.id);
        setCurrentDocId(docRef.id);
      }
      
      await fetchHistory(user.uid);
      alert("Documento salvo com sucesso!");
    } catch (error) {
      console.error("❌ ERRO COMPLETO ao salvar:", error);
      if (error instanceof Error) {
        console.error("Mensagem:", error.message);
        console.error("Code:", (error as any).code);
      }
      alert(`Erro ao salvar o documento: ${error instanceof Error ? error.message : 'Desconhecido'}`);
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
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) return;
    
    try {
      await deleteDoc(doc(db, 'authorizations', id));
      if (currentDocId === id) {
        setCurrentDocId(null);
        setData(INITIAL_AUTH_DATA);
      }
      if (user) fetchHistory(user.uid);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir o documento.");
    }
  };

  const handleAiFill = async (text: string) => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const parsed = await parsePaymentText(text);
      setData(prev => ({
        ...prev,
        ...parsed,
        beneficiaries: (parsed as any).beneficiaries?.map((b: any, i: number) => ({
          ...b,
          id: prev.beneficiaries[i]?.id || crypto.randomUUID()
        })) || prev.beneficiaries
      }));
    } catch (error) {
      console.error(error);
      alert("Erro ao processar com IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadPdf = async (elementId: string, suffix: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    setIsPdfLoading(true);

    const clientNameSanitized = data.clientName.trim().replace(/\s+/g, '_') || 'Pagamento';
    const opt = {
      margin: 0,
      filename: `${suffix}_${clientNameSanitized}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 3,
        useCORS: true, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error(`Erro ao gerar PDF (${suffix}):`, error);
      alert(`Erro ao baixar ${suffix}.`);
    } finally {
      setIsPdfLoading(false);
    }
  };
  const handleSaveToDrive = async (elementId: string, fileName: string) => {
  try {
    setIsPdfLoading(true);
    
    // Gerar PDF
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2pdf().set({
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).outputPdf('blob');

    // Criar pasta no Google Drive
    const folderName = `Autorização_${data.clientName}_${new Date().toISOString().split('T')[0]}`;
    const folderId = "1vFEgKm26lA7LBrFqh3Tv3zsHVWthne_X";
    // Upload do PDF
    await uploadFileToDrive(
      `${NUVEM}_${data.clientName}.pdf`,
      new Blob([canvas], { type: 'application/pdf' }),
      folderId
    );

    alert("✅ Documento salvo no Google Drive com sucesso!");
  } catch (error) {
    console.error("❌ Erro:", error);
    alert("Erro ao salvar no Google Drive");
  } finally {
    setIsPdfLoading(false);
  }
};
  
  {showPreview && (
  <>
    {/* Botões existentes de download... */}
    <button
      onClick={() => handleSaveToDrive('autorizacao-documento', 'Autorização')}
      disabled={isPdfLoading}
      className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition font-medium flex items-center space-x-2"
    >
      <i className="fab fa-google"></i>
      <span>Salvar no Google Drive</span>
    </button>
  </>
)}

  return (
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-zinc-900 transition-colors duration-300">
      <nav className="bg-indigo-700 dark:bg-indigo-900 text-white shadow-lg p-4 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-file-invoice-dollar text-2xl"></i>
              <h1 className="text-xl font-bold tracking-tight">Gerador de Autorização</h1>
            </div>
            {user && (
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="text-indigo-200 hover:text-white transition text-sm flex items-center space-x-1"
              >
                <i className="fas fa-history"></i>
                <span>Meus Salvos</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 items-center">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-indigo-600 dark:bg-indigo-800 hover:bg-indigo-500 transition-colors mr-2"
              title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>

            {user ? (
              <div className="flex items-center space-x-3 mr-2">
                <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border-2 border-indigo-400" referrerPolicy="no-referrer" />
                <button onClick={handleLogout} className="text-xs text-indigo-200 hover:text-white underline">Sair</button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg transition font-bold text-sm flex items-center space-x-2"
              >
                <i className="fab fa-google"></i>
                <span>Entrar com Google</span>
              </button>
            )}

            {user && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-lg transition font-medium flex items-center space-x-2 ${isSaving ? 'opacity-70' : ''}`}
              >
                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                <span>{currentDocId ? 'Atualizar' : 'Salvar'}</span>
              </button>
            )}

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 px-4 py-2 rounded-lg transition font-medium flex items-center space-x-2"
            >
              <i className={`fas ${showPreview ? 'fa-edit' : 'fa-eye'}`}></i>
              <span>{showPreview ? 'Editar Dados' : 'Ver Documento'}</span>
            </button>
            {showPreview && (
              <>
                <button
                  onClick={() => handleDownloadPdf('capa-documento', 'Capa')}
                  disabled={isPdfLoading}
                  className={`bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 rounded-lg transition font-medium flex items-center space-x-2 ${isPdfLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <i className="fas fa-file-download"></i>
                  <span>Baixar Capa</span>
                </button>
                <button
                  onClick={() => handleDownloadPdf('autorizacao-documento', 'Autorizacao')}
                  disabled={isPdfLoading}
                  className={`bg-green-600 hover:bg-green-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 px-4 py-2 rounded-lg transition font-medium flex items-center space-x-2 ${isPdfLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <i className="fas fa-file-invoice"></i>
                  <span>Baixar Autorização</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={`${showPreview ? '' : 'max-w-5xl mx-auto px-4 mt-8'}`}>
        {showHistory && user && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex justify-end animate-fadeIn no-print" onClick={() => setShowHistory(false)}>
            <div className="bg-white dark:bg-zinc-800 w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 border-b dark:border-zinc-700 pb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-zinc-100 flex items-center">
                  <i className="fas fa-cloud-download-alt mr-2 text-indigo-600 dark:text-indigo-400"></i>
                  Documentos Salvos
                </h2>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 dark:text-zinc-400 text-sm">Carregando histórico...</p>
                </div>
              ) : savedAuthorizations.length === 0 ? (
                <div className="text-center py-20">
                  <i className="fas fa-folder-open text-4xl text-gray-200 dark:text-zinc-700 mb-4"></i>
                  <p className="text-gray-500 dark:text-zinc-400">Nenhum documento salvo ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAuthorizations.map((doc) => (
                    <div 
                      key={doc.id}
                      onClick={() => handleLoadDoc(doc)}
                      className={`p-4 rounded-xl border transition cursor-pointer group flex justify-between items-center ${currentDocId === doc.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' : 'border-gray-100 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-zinc-700/50'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 dark:text-zinc-100 truncate">{doc.clientName}</h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          {doc.updatedAt?.toDate ? doc.updatedAt.toDate().toLocaleString('pt-BR') : 'Data desconhecida'}
                        </p>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="text-[10px] bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 px-2 py-0.5 rounded">
                            {doc.beneficiaries?.length || 0} beneficiários
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            {doc.totalAmount}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!showPreview ? (
          <div className="space-y-6">
            <section className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 no-print">
              <div className="flex items-center space-x-2 mb-4 text-indigo-700 dark:text-indigo-400">
                <i className="fas fa-magic"></i>
                <h2 className="text-lg font-semibold">Preenchimento Automático</h2>
              </div>
              <textarea
                placeholder="Cole o texto aqui (IA extrairá nomes, CPF, valores e beneficiários)..."
                className="w-full h-24 p-4 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm dark:text-zinc-200"
                onBlur={(e) => handleAiFill(e.target.value)}
              ></textarea>
              {isAiLoading && <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2 animate-pulse">Processando com Inteligência Artificial...</p>}
            </section>

            {/* Abas do Formulário */}
            <div className="flex border-b border-gray-200 dark:border-zinc-700">
              <button
                onClick={() => setActiveTab('auth')}
                className={`px-6 py-3 font-bold text-sm transition ${activeTab === 'auth' ? 'text-indigo-700 dark:text-indigo-400 border-b-2 border-indigo-700 dark:border-indigo-400 bg-white dark:bg-zinc-800 rounded-t-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300'}`}
              >
                <i className="fas fa-file-contract mr-2"></i>
                Autorização
              </button>
              <button
                onClick={() => setActiveTab('cover')}
                className={`px-6 py-3 font-bold text-sm transition ${activeTab === 'cover' ? 'text-indigo-700 dark:text-indigo-400 border-b-2 border-indigo-700 dark:border-indigo-400 bg-white dark:bg-zinc-800 rounded-t-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300'}`}
              >
                <i className="fas fa-file-invoice mr-2"></i>
                Capa
              </button>
            </div>

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
          <div className="animate-fadeIn relative">
            {isPdfLoading && (
              <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center loading-overlay">
                <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center font-sans">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-zinc-100">Gerando PDF</h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">Aguarde um momento...</p>
                  </div>
                </div>
              </div>
            )}
            <DocumentPreview 
              data={data} 
              ref={previewRef} 
              onUpdate={handleUpdateData}
              onUpdateBeneficiary={handleUpdateBeneficiary}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
