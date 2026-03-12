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
  deleteDoc
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
      if (currentUser) fetchHistory(currentUser.uid);
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
      alert("Erro no login. Verifique pop-ups.");
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
      console.error(error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSaveToDrive = async (elementId: string) => {
    if (!data.clientName.trim()) { alert("Preencha o nome do cliente."); return; }
    try {
      setIsPdfLoading(true);
      const element = document.getElementById(elementId);
      if (!element) return;

      const opt = {
        margin: 0,
        filename: `Autorizacao_${data.clientName}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const folderId = "1vFEgKm26lA7LBrFqh3Tv3zsHVWthne_X";
      const driveId = await uploadFileToDrive(`Autorizacao_${data.clientName}.pdf`, pdfBlob, folderId);

      if (driveId) alert("✅ Salvo no Google Drive com sucesso!");
    } catch (error: any) {
      alert("❌ Erro no Drive: " + error.message);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
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
      alert("Salvo no sistema!");
    } catch (error) {
      alert("Erro ao salvar.");
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
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-zinc-900">
      <nav className="bg-indigo-700 dark:bg-indigo-900 text-white p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Belocorp - Gerador</h1>
          <div className="flex gap-2">
            {user && (
              <>
                <button onClick={() => setShowHistory(!showHistory)} className="text-sm mr-4">Histórico</button>
                <button onClick={handleSave} disabled={isSaving} className="bg-indigo-500 px-3 py-1 rounded text-sm">Salvar</button>
              </>
            )}
            <button onClick={() => setShowPreview(!showPreview)} className="bg-indigo-600 px-3 py-1 rounded text-sm">
              {showPreview ? 'Editar' : 'Visualizar'}
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
                <div key={doc.id} onClick={() => { setData(doc); setCurrentDocId(doc.id); setShowHistory(false); }} className="p-3 border-b cursor-pointer dark:text-white">
                  {doc.clientName}
                </div>
              ))}
            </div>
          </div>
        )}

        {!showPreview ? (
          <div className="space-y-6">
            <textarea
              placeholder="Cole o texto aqui..."
              className="w-full h-24 p-4 border rounded dark:bg-zinc-800 dark:text-white"
              onBlur={(e) => handleAiFill(e.target.value)}
            ></textarea>
            {isAiLoading && <p className="text-indigo-500 animate-pulse">IA Processando...</p>}
            <div className="flex border-b border-gray-200 dark:border-zinc-700">
              <button onClick={() => setActiveTab('auth')} className={`px-4 py-2 ${activeTab === 'auth' ? 'border-b-2 border-indigo-700 dark:text-white' : 'text-gray-400'}`}>Autorização</button>
              <button onClick={() => setActiveTab('cover')} className={`px-4 py-2 ${activeTab === 'cover' ? 'border-b-2 border-indigo-700 dark:text-white' : 'text-gray-400'}`}>Capa</button>
            </div>
            <PaymentForm data={data} activeTab={activeTab} onUpdate={handleUpdateData} onAddBeneficiary={handleAddBeneficiary} onRemoveBeneficiary={handleRemoveBeneficiary} onUpdateBeneficiary={handleUpdateBeneficiary} />
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-2 mb-4 no-print">
              <button onClick={() => handleDownloadPdf('autorizacao-documento', 'Autorizacao')} className="bg-green-600 text-white px-4 py-2 rounded">PDF Local</button>
              <button onClick={() => handleSaveToDrive('autorizacao-documento')} disabled={isPdfLoading} className="bg-blue-600 text-white px-4 py-2 rounded">
                {isPdfLoading ? 'Salvando...' : 'Salvar no Drive'}
              </button>
            </div>
            <DocumentPreview data={data} ref={previewRef} onUpdate={handleUpdateData} onUpdateBeneficiary={handleUpdateBeneficiary} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
