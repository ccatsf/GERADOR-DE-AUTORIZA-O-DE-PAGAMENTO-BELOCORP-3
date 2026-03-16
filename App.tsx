import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Dashboard } from './Dashboard';
import PaymentGenerator from './PaymentGenerator';
import Appointments from './Appointments';
import CRM from './CRM_System/CRM';
import Whiteboard from './Whiteboard';
import { countActiveClients, getSheetNames, getSpreadsheetData } from './services/googleSheetsService';
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem('google_access_token'));
  const [clientCount, setClientCount] = useState<number | string>('-');
  const [appointmentDays, setAppointmentDays] = useState<any[]>([]);
  const [missingDocsCount, setMissingDocsCount] = useState(0);  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Salvar token do Google no sessionStorage para persistir na sessão
  useEffect(() => {
    const savedToken = sessionStorage.getItem('google_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
  }, []);

  const handleSetAccessToken = (token: string | null) => {
    setAccessToken(token);
    if (token) {
      sessionStorage.setItem('google_access_token', token);
    } else {
      sessionStorage.removeItem('google_access_token');
    }
  };

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
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchClientCount = async () => {
      if (accessToken) {
        try {
          const { getSpreadsheetData } = await import('./services/googleSheetsService');
          const names = await getSheetNames(accessToken);
          const now = new Date();
          const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
          const currentMonthName = months[now.getMonth()];
          const matchingSheet = names.find(n => n.toUpperCase().includes(currentMonthName)) || names[0];
          
          if (matchingSheet) {
            const count = await countActiveClients(matchingSheet, accessToken);
            setClientCount(count);

            // Buscar dados para o calendário
            const data = await getSpreadsheetData(matchingSheet, accessToken);
            const dayMap = new Map<number, boolean>();
            data.forEach(row => {
              const paymentDate = row[2]; // Coluna C (DD/MM/YYYY)
              if (paymentDate) {
                const [d, m, y] = paymentDate.split('/').map(Number);
                if (m === now.getMonth() + 1 && y === now.getFullYear()) {
                  dayMap.set(d, true);
                }
              }
            });
            setAppointmentDays(Array.from(dayMap.keys()));
          }
        } catch (error) {
          console.error("Erro ao buscar dados da planilha:", error);
        }
      }
    };

    fetchClientCount();
  }, [accessToken]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { alert("Falha na autenticação."); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); setActiveTab('dashboard'); } 
    catch (error) { console.error(error); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-zinc-950 p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-zinc-900 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border dark:border-zinc-800 animate-fadeIn">
          <div className="bg-indigo-600 text-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <i className="fas fa-user-shield text-4xl"></i>
          </div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2 uppercase tracking-tight">ADM BELOCORP</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg">Sistema Administrativo Interno</p>
          <button 
            onClick={handleLogin} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl hover:shadow-indigo-500/20 flex items-center justify-center space-x-3 transform hover:-translate-y-1"
          >
            <i className="fab fa-google text-xl"></i>
            <span>ENTRAR COM GOOGLE</span>
          </button>
          <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest font-bold">Acesso restrito a colaboradores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
      {/* Sidebar - Dark fixed sidebar */}
      <aside className="w-80 bg-black text-white p-8 flex flex-col justify-between hidden lg:flex">
        <div>
          <h1 className="text-xs font-bold tracking-[0.2em] mb-12 uppercase text-gray-400">ADM BELOCORP</h1>
          
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-4 group">
              <img 
                src={user.photoURL || 'https://via.placeholder.com/150'} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-zinc-800 object-cover group-hover:border-purple-500 transition-colors"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-center">{user.displayName || 'Usuário'}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-12">
            <div className="text-center p-2 col-span-2">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Clientes Ativos</p>
              <p className="text-3xl font-bold text-purple-500">{clientCount}</p>
              {!accessToken && <p className="text-[8px] text-gray-600 mt-1">(Conecte em Agendamentos)</p>}
            </div>
          </div>

          {/* Mini Calendário na Sidebar */}
          <div className="bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800 mb-8">
             <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-gray-500 mb-4">
                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => <span key={d}>{d}</span>)}
             </div>
             <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const isAppointmentDay = appointmentDays.includes(day);
                  const isToday = day === new Date().getDate();
                  return (
                    <span 
                      key={day} 
                      className={`text-[10px] py-1 rounded-lg transition-all ${
                        isToday ? 'bg-purple-600 text-white font-bold' : 
                        isAppointmentDay ? 'bg-purple-900/30 text-purple-400 font-bold border border-purple-500/30' : 
                        'text-gray-400'
                      }`}
                    >
                      {day}
                    </span>
                  );
                })}
             </div>
          </div>

          {/* Navegação */}
          <nav className="flex flex-col gap-2">
            {[
              { id: 'dashboard',    icon: 'fa-home',                label: 'Dashboard' },
              { id: 'payment',      icon: 'fa-file-invoice-dollar', label: 'Gerador' },
              { id: 'appointments', icon: 'fa-calendar-alt',        label: 'Agendamentos' },
              { id: 'whiteboard',   icon: 'fa-chalkboard',          label: 'Quadro' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <i className={`fas ${tab.icon} w-5 text-center`}></i>
                <span className="uppercase tracking-widest text-xs">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 text-gray-500 hover:text-white transition-colors group font-bold text-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center group-hover:bg-red-500/10 group-hover:text-red-500 transition-all">
            <i className="fas fa-sign-out-alt"></i>
          </div>
          <span className="uppercase tracking-widest">Sair</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-24 bg-black lg:bg-transparent flex items-center justify-between px-8 lg:px-12 z-40">
          <div className="lg:hidden">
             <h1 className="text-white text-xs font-bold tracking-widest">ADM BELOCORP</h1>
          </div>
          <h2 className="text-white lg:text-black dark:lg:text-white text-xl font-black uppercase tracking-[0.3em] mx-auto lg:ml-0 lg:mr-auto">
            {activeTab === 'dashboard' ? 'DASHBOARD' : activeTab === 'payment' ? 'GERADOR' : activeTab === 'appointments' ? 'AGENDAMENTOS' : 'QUADRO'}
          </h2>
          <div className="flex items-center space-x-6">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-gray-400 hover:text-purple-500 transition-colors">
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
            </button>
            <div className="relative cursor-pointer group" onClick={() => setActiveTab('crm')}>
              <i className="fas fa-bell text-gray-400 text-xl group-hover:text-purple-500 transition-colors"></i>
              {missingDocsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] font-bold px-1 rounded-full border-2 border-black lg:border-gray-50 dark:lg:border-zinc-950">
                  {missingDocsCount}
                </span>
              )}
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-800 lg:bg-zinc-200 dark:lg:bg-zinc-800 flex items-center justify-center cursor-pointer border-2 border-transparent hover:border-purple-500 transition-all overflow-hidden">
              <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className={`flex-1 overflow-hidden ${activeTab === 'whiteboard' ? '' : 'overflow-y-auto p-8 lg:p-12'}`}>
          {activeTab === 'dashboard' ? (
            <Dashboard user={user} onNavigate={setActiveTab} />
          ) : activeTab === 'payment' ? (
            <div className="animate-fadeIn">
               <PaymentGenerator user={user} onBack={() => setActiveTab('dashboard')} />
            </div>
          ) : activeTab === 'appointments' ? (
            <div className="animate-fadeIn">
               <Appointments user={user} onBack={() => setActiveTab('dashboard')} onConnect={handleSetAccessToken} />
            </div>
          ) : activeTab === 'whiteboard' ? (
            <div className="h-full overflow-hidden">
              <Whiteboard onBack={() => setActiveTab('dashboard')} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default App;
