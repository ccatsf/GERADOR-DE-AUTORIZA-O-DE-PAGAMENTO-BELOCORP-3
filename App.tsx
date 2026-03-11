import { uploadFileToDrive } from './src_services_googleDriveService_Version2';
import React, { useState, useRef, useEffect } from 'react';
import { PaymentAuthData, INITIAL_AUTH_DATA, Beneficiary } from './types';
import { parsePaymentText } from './services/geminiService.ts';
import PaymentForm from './PaymentForm.tsx';
import DocumentPreview from './DocumentPreview.tsx';
import { maskCurrency, parseCurrency } from './formatters.ts';
import { auth, db } from './firebase.ts';
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
  getDocFromServer
} from 'firebase/firestore';

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchHistory(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

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
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("Erro ao fazer login. Verifique se os pop-ups estão permitidos.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentDocId(null);
    setData(INITIAL_AUTH_DATA);
  };

  const fetchHistory = async (uid: string) => {
    setIsHistoryLoading(true);
    try {
      const q = query(collection(db, 'authorizations'), where('uid', '==', uid), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedAuthorizations(docs);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // FUNÇÃO DE SALVAMENTO NO DRIVE CORRIGIDA
  const handleSaveToDrive = async (elementId: string) => {
    if (!data.clientName.trim()) {
      alert("Por favor, preencha o nome do cliente antes de salvar.");
      return;
    }

    try {
      setIsPdfLoading(true);
      const element = document.getElementById(elementId);
      if (!element) throw new Error("Elemento do documento não encontrado.");

      // 1. Gerar o PDF como Blob
      const opt = {
        margin: 0,
        filename: `Autorizacao_${data.clientName}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');

      // 2. Tentar Upload para o Drive
      const folderId = "1vFEgKm26lA7LBrFqh3Tv3zsHVWthne_X"; // Sua pasta Belocorp
      const driveId = await uploadFileToDrive(
        `Autorizacao_${data.clientName}.pdf`,
        pdfBlob,
        folderId
      );

      if (driveId) {
        alert("✅ SUCESSO! O arquivo foi salvo no Google Drive da Belocorp.");
      }
    } catch (error: any) {
      console.error("Erro no Drive:", error);
      if (error.message?.includes('popup_blocked') || error.code === 'auth/popup-blocked') {
        alert("❌ O navegador bloqueou a janela. Clique no ícone de 'X' na barra de endereços e permita pop-ups.");
      } else {
        alert("❌ Erro ao salvar no Drive: " + (error.message || "Verifique sua conexão"));
      }
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) { alert("Faça login para salvar."); return; }
    setIsSaving(true);
    try {
      const payload = { ...data, uid: user.uid, updatedAt: serverTimestamp() };
      if (currentDocId) {
        await updateDoc(doc(db, 'authorizations', currentDocId), payload);
      } else {
        const docRef = await addDoc(collection(db, 'authorizations'), { ...payload, createdAt: serverTimestamp() });
        setCurrentDocId(docRef.id);
      }
      await fetchHistory(user.uid);
      alert("Salvo no sistema! Clique em 'Ver Documento' para enviar ao Drive.");
    } catch (error) {
      alert("Erro ao salvar no sistema.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiFill = async (text: string) => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const parsed = await parsePaymentText(text);
      setData(prev => ({ ...prev, ...parsed }));
    } catch (error) {
      alert("Erro na IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadPdf = async (elementId: string, suffix: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    setIsPdfLoading(true);
    const opt = { margin: 0, filename: `${suffix}_${data.clientName}.pdf`, jsPDF: { unit: 'mm', format: 'a4' } };
    try { await html2pdf().set(opt).from(element).save(); } catch (error) { alert("Erro ao baixar."); } finally { setIsPdfLoading(false); }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-zinc-900 transition-colors duration-300">
      <nav className="bg-indigo-700 dark:bg-indigo-900 text-white shadow-lg p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Belocorp - Gerador</h1>
            {user && (
              <button onClick={() => setShowHistory(!showHistory)} className="text-indigo-200 hover:text-white text-sm">
                <i className="fas fa-history mr-1"></i> Histórico
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-indigo-600">
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            {user ? (
              <div className="flex items-center space-x-3">
                <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" />
                <button onClick={handleLogout} className="text-xs underline">Sair</button>
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold">Login Google</button>
            )}
            {user && (
              <button onClick={handleSave} disabled={isSaving} className="bg-indigo-500 px-4 py-2 rounded-lg text-sm">
                <i className="fas fa-save mr-1"></i> {currentDocId ? 'Atualizar' : 'Salvar'}
              </button>
            )}
            <button onClick={() => setShowPreview(!showPreview)} className="bg-indigo-600 px-4 py-2 rounded-lg text-sm">
              <i className={`fas ${showPreview ? 'fa-edit' : 'fa-eye'} mr-1`}></i> {showPreview ? 'Editar' : 'Visualizar'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        {showHistory && user && (
           <div className="fixed inset-0 bg-black/50 z-[60] flex justify-end" onClick={() => setShowHistory(false)}>
              <div className="bg-white dark:bg-zinc-800 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 dark:text-white">Histórico</h2>
                {savedAuthorizations.map(doc => (
                  <div key={doc.id} onClick={() => { setData(doc); setCurrentDocId(doc.id); setShowHistory(false); }} className="p-3 border-b cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-white">
                    {doc.clientName} - {new Date(doc.updatedAt?.seconds * 1000).toLocaleDateString()}
                  </div>
                ))}
              </div>
           </div>
        )}

        {!showPreview ? (
          <div className="space-y-6">
            <textarea
              placeholder="Cole o texto para a IA preencher..."
              className="w-full h-24 p-4 border rounded-lg dark:bg-zinc-800 dark:text-white"
              onBlur={(e) => handleAiFill(e.target.value)}
            ></textarea>
            {isAiLoading && <p className="text-indigo-500 animate-pulse">IA Processando...</p>}
            
            <div className="flex border-b">
              <button onClick={() => setActive
};

export default App;
