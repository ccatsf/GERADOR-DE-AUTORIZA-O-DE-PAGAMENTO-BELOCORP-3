import { findOrCreateFolder, uploadFileToDrive } from './src_services_googleDriveService_Version2';
import React, { useState, useRef, useEffect } from 'react';
import { PaymentAuthData, INITIAL_AUTH_DATA, Beneficiary } from './types';
import { parsePaymentText } from './services/geminiService.ts';
import PaymentForm from './PaymentForm.tsx';
import DocumentPreview from './DocumentPreview.tsx';
import { maskCurrency, parseCurrency } from './formatters.ts';
import { auth, db, googleProvider } from './firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User, GoogleAuthProvider } from 'firebase/auth';
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
  setDoc,
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
  const [googleDriveToken, setGoogleDriveToken] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

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

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { alert("Falha na autenticação."); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); setCurrentDocId(null); setData(INITIAL_AUTH_DATA); } 
    catch (error) { console.error(error); }
  };

  const fetchHistory = async (uid: string) => {
    setIsHistoryLoading(true);
    try {
      const q = query(collection(db, 'authorizations'), where('uid', '==', uid), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setSavedAuthorizations(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } finally { setIsHistoryLoading(false); }
  };
  
  // FUNÇÃO DE SALVAR ÚNICA E MELHORADA
  const handleSave = async () => {
    if (!user) { alert("Faça login para salvar."); return; }
    
    setIsSaving(true);
    try {
      let googleToken = googleDriveToken;

      // 0. Tenta obter o token apenas se não tiver um ou se o salvamento falhar depois
      if (!googleToken) {
        console.log("Obtendo nova autorização do Google Drive...");
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        googleToken = credential?.accessToken || null;
        
        if (googleToken) {
          setGoogleDriveToken(googleToken); // Guarda o token para o próximo salvamento
        }
      }

      if (!googleToken) {
        throw new Error("Não foi possível obter acesso ao Google Drive. Verifique se as janelas pop-up estão liberadas.");
      }

      const payload = { ...data, uid: user.uid, updatedAt: serverTimestamp() };

      // 1. Salva no Firebase (Histórico)
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

        // 1. Verificar se o usuário já tem uma pasta vinculada no Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        let folderId = userDoc.exists() ? userDoc.data().driveFolderId : null;

        if (!folderId) {
          // 2. Se não tiver ID salvo, busca pelo e-mail ou cria uma nova
          const userEmail = user.email;
          if (!userEmail) throw new Error("E-mail não identificado.");
          
          console.log("Vínculo de pasta não encontrado no sistema. Buscando no Drive...");
          folderId = await findOrCreateFolder(userEmail, googleToken);
          
          // 3. Salva o ID da pasta no Firestore para nunca mais precisar buscar pelo nome
          await setDoc(userRef, { driveFolderId: folderId }, { merge: true });
          console.log("ID da pasta vinculado ao seu usuário com sucesso!");
        }

        // 4. Envia o arquivo para a pasta vinculada (pode renomear no Drive à vontade!)
        try {
          await uploadFileToDrive(
            `Autorizacao_${data.clientName.replace(/\s+/g, '_')}.pdf`,
            pdfBlob,
            folderId,
            googleToken
          );
        } catch (driveError: any) {
          console.warn("Falha ao salvar na pasta específica, tentando na raiz:", driveError);
          await uploadFileToDrive(
            `Autorizacao_${data.clientName.replace(/\s+/g, '_')}.pdf`,
            pdfBlob,
            undefined,
            googleToken
          );
        }
        alert("✅ Salvo no sistema e enviado para sua pasta no Google Drive!");
      } else {
        // Se o elemento não for encontrado, ele salva apenas no sistema
        alert("✅ Salvo no sistema! (Abra 'Ver Documento' para enviar ao Drive)");
      }

      await fetchHistory(user.uid);

      // 5. Atualizar Diretório de Beneficiários (Alimentar o banco de dados)
      try {
        const batch = data.beneficiaries.map(async (b) => {
          if (!b.name) return; // Só salva se tiver nome
          
          // O ID do documento no diretório será o nome normalizado para evitar duplicatas básicas
          const beneficiaryId = b.document.replace(/\D/g, '') || b.name.toLowerCase().trim().replace(/\s+/g, '_');
          const beneficiaryRef = doc(db, 'beneficiaries_directory', beneficiaryId);
          
          // Prepara os dados para salvar (remove o ID interno do formulário)
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
      
      // Se for um erro de autorização, limpa o token para pedir novamente no próximo clique
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
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-zinc-900 transition-colors duration-300">
      <nav className="bg-indigo-700 dark:bg-indigo-900 text-white shadow-lg p-4 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-file-invoice-dollar text-2xl"></i>
              <h1 className="text-xl font-bold tracking-tight">Gerador de Autorização</h1>
            </div>
            {user && (
              <button onClick={() => setShowHistory(!showHistory)} className="text-indigo-200 hover:text-white transition text-sm flex items-center space-x-1">
                <i className="fas fa-history"></i>
                <span>Meus Salvos</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 items-center">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-indigo-600 dark:bg-indigo-800 hover:bg-indigo-500 transition-colors mr-2">
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>

            {user ? (
              <div className="flex items-center space-x-3 mr-2">
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border-2 border-indigo-400" />
                <button onClick={handleLogout} className="text-xs text-indigo-200 hover:text-white underline">Sair</button>
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg transition font-bold text-sm flex items-center space-x-2">
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

            <button onClick={() => setShowPreview(!showPreview)} className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 px-4 py-2 rounded-lg transition font-medium flex items-center space-x-2">
              <i className={`fas ${showPreview ? 'fa-edit' : 'fa-eye'}`}></i>
              <span>{showPreview ? 'Editar Dados' : 'Ver Documento'}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className={`${showPreview ? '' : 'max-w-5xl mx-auto px-4 mt-8'}`}>
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

        {!showPreview ? (
          <div className="space-y-6">
            <section className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border dark:border-zinc-700">
              <textarea placeholder="Cole o texto aqui..." className="w-full h-24 p-4 border dark:border-zinc-700 dark:bg-zinc-900 rounded-lg outline-none dark:text-white" onBlur={(e) => handleAiFill(e.target.value)}></textarea>
            </section>
            <PaymentForm data={data} activeTab={activeTab} onUpdate={handleUpdateData} onAddBeneficiary={handleAddBeneficiary} onRemoveBeneficiary={handleRemoveBeneficiary} onUpdateBeneficiary={handleUpdateBeneficiary} />
          </div>
        ) : (
          <div className="relative">
            {isPdfLoading && <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full"></div></div>}
            <div className="flex justify-center gap-4 mb-4 no-print">
               <button onClick={() => handleDownloadPdf('capa-documento', 'Capa')} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Baixar Capa</button>
               <button onClick={() => handleDownloadPdf('autorizacao-documento', 'Autorizacao')} className="bg-green-600 text-white px-4 py-2 rounded-lg">Baixar Autorização</button>
            </div>
            <DocumentPreview data={data} ref={previewRef} onUpdate={handleUpdateData} onUpdateBeneficiary={handleUpdateBeneficiary} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

