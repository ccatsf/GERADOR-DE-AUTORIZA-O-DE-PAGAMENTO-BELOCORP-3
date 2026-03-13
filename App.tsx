import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import Dashboard from './Dashboard';
import PaymentGenerator from './PaymentGenerator';
import Appointments from './Appointments';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

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
            <div className="text-center p-2">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Clientes</p>
              <p className="text-3xl font-bold text-purple-500">80</p>
            </div>
            <div className="text-center p-2">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Previsão</p>
              <p className="text-sm font-bold text-gray-300">(PREVISÃO...)</p>
            </div>
          </div>

          {/* Mini Calendário na Sidebar */}
          <div className="bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800">
             <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-gray-500 mb-4">
                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => <span key={d}>{d}</span>)}
             </div>
             <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <span 
                    key={day} 
                    className={`text-[10px] py-1 rounded-lg ${day === 13 ? 'bg-purple-600 text-white font-bold' : 'text-gray-400'}`}
                  >
                    {day}
                  </span>
                ))}
             </div>
          </div>
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
            {activeTab === 'dashboard' ? 'DASHBOARD' : activeTab === 'payment' ? 'GERADOR' : 'AGENDAMENTOS'}
          </h2>
          <div className="flex items-center space-x-6">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-gray-400 hover:text-purple-500 transition-colors">
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
            </button>
            <div className="relative cursor-pointer group">
              <i className="fas fa-bell text-gray-400 text-xl group-hover:text-purple-500 transition-colors"></i>
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] font-bold px-1 rounded-full border-2 border-black lg:border-gray-50 dark:lg:border-zinc-950">2</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-800 lg:bg-zinc-200 dark:lg:bg-zinc-800 flex items-center justify-center cursor-pointer border-2 border-transparent hover:border-purple-500 transition-all overflow-hidden">
              <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          {activeTab === 'dashboard' ? (
            <Dashboard user={user} onNavigate={setActiveTab} />
          ) : activeTab === 'payment' ? (
            <div className="animate-fadeIn">
               <button 
                 onClick={() => setActiveTab('dashboard')} 
                 className="mb-6 flex items-center space-x-2 text-gray-500 hover:text-purple-600 font-bold uppercase text-xs tracking-widest transition-colors"
               >
                 <i className="fas fa-arrow-left"></i>
                 <span>Voltar ao Dashboard</span>
               </button>
               <PaymentGenerator user={user} />
            </div>
          ) : activeTab === 'appointments' ? (
            <div className="animate-fadeIn">
               <button 
                 onClick={() => setActiveTab('dashboard')} 
                 className="mb-6 flex items-center space-x-2 text-gray-500 hover:text-purple-600 font-bold uppercase text-xs tracking-widest transition-colors"
               >
                 <i className="fas fa-arrow-left"></i>
                 <span>Voltar ao Dashboard</span>
               </button>
               <Appointments user={user} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default App;
