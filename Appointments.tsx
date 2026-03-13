import React, { useState, useEffect } from 'react';
import { User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
import { getSpreadsheetData, addRowToSpreadsheet, getSheetNames } from './services/googleSheetsService';
import { maskCurrency, parseCurrency } from './formatters';

interface AppointmentsProps {
  user: User | null;
  onBack?: () => void;
}

interface AppointmentDay {
  date: string;
  dayOfWeek: string;
  totalValue: number;
  maxLimit: number;
  available: boolean;
}

const Appointments: React.FC<AppointmentsProps> = ({ user, onBack }) => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [days, setDays] = useState<AppointmentDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Form for new appointment
  const [newAppointment, setNewAppointment] = useState({
    clientName: '',
    planValue: '',
    surgeryDate: '',
    paymentDate: '',
    type: 'PAGAMENTO'
  });

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      console.log("Iniciando conexão com Google Sheets...");
      const provider = new GoogleAuthProvider();
      // Scopes necessários para Planilhas
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      
      const result = await signInWithPopup(auth, provider);
      console.log("Autenticação Google realizada com sucesso");
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      
      if (!token) {
        throw new Error("Não foi possível obter o token de acesso do Google.");
      }

      setAccessToken(token);
      console.log("Token obtido, buscando nomes das abas...");

      const names = await getSheetNames(token);
      console.log("Abas encontradas:", names);
      setSheetNames(names);
      
      const now = new Date();
      const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      const currentMonthName = months[now.getMonth()];
      const matchingSheet = names.find(n => n.toUpperCase().includes(currentMonthName)) || names[0];
      setCurrentSheet(matchingSheet);
      
    } catch (err: any) {
      console.error("Erro detalhado na conexão:", err);
      let errorMsg = "Erro ao conectar com Google Sheets.";
      
      if (err.code === 'auth/popup-blocked') {
        errorMsg = "O navegador bloqueou o pop-up de login. Por favor, habilite pop-ups para este site.";
      } else if (err.message) {
        errorMsg = `Erro: ${err.message}`;
      }
      
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const MAX_LIMIT_PER_DAY = 70000;

  useEffect(() => {
    // No automatic fetch on mount to avoid blank screen and blocked popups
  }, []);

  useEffect(() => {
    if (currentSheet && accessToken) {
      loadDays();
    }
  }, [currentSheet, accessToken]);

  const loadDays = async () => {
    setIsLoading(true);
    try {
      const data = await getSpreadsheetData(currentSheet, accessToken!);
      
      // Agrupar por data de pagamento (coluna C - index 2)
      const dayMap = new Map<string, { total: number, dayOfWeek: string }>();

      data.forEach(row => {
        const paymentDate = row[2]; // Coluna C
        const dayOfWeek = row[3]; // Coluna D
        const valueStr = row[4]; // Coluna E
        
        if (paymentDate && valueStr) {
          const value = parseCurrency(valueStr);
          const current = dayMap.get(paymentDate) || { total: 0, dayOfWeek: dayOfWeek || '' };
          dayMap.set(paymentDate, {
            total: current.total + value,
            dayOfWeek: current.dayOfWeek || dayOfWeek || ''
          });
        }
      });

      const appointmentDays: AppointmentDay[] = Array.from(dayMap.entries()).map(([date, info]) => ({
        date,
        dayOfWeek: info.dayOfWeek,
        totalValue: info.total,
        maxLimit: MAX_LIMIT_PER_DAY,
        available: info.total < MAX_LIMIT_PER_DAY
      })).sort((a, b) => {
        const [d1, m1, y1] = a.date.split('/').map(Number);
        const [d2, m2, y2] = b.date.split('/').map(Number);
        return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
      });

      setDays(appointmentDays);
    } catch (err) {
      console.error("Erro ao carregar dias:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !currentSheet) return;
    
    setIsSaving(true);
    try {
      // Formato esperado pela planilha: [TIPO, CIRURGIA, PAGAMENTO, DIA, VALOR, CLIENTE, STATUS]
      // Precisamos descobrir o dia da semana para a data de pagamento
      const [d, m, y] = newAppointment.paymentDate.split('/').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const daysOfWeek = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      const dayOfWeek = daysOfWeek[dateObj.getDay()];

      const row = [
        newAppointment.type, // Coluna A (TIPO DE PG)
        newAppointment.surgeryDate, // Coluna B (CIRURGIA)
        newAppointment.paymentDate, // Coluna C (PAGAMENTO)
        dayOfWeek, // Coluna D (DIA)
        maskCurrency((parseCurrency(newAppointment.planValue) * 100).toString()), // Coluna E (VALOR)
        newAppointment.clientName.toUpperCase(), // Coluna F (CLIENTE)
        'A PAGAR' // Coluna G (STATUS)
      ];

      await addRowToSpreadsheet(currentSheet, row, accessToken);
      alert("Agendamento realizado com sucesso!");
      setNewAppointment({
        clientName: '',
        planValue: '',
        surgeryDate: '',
        paymentDate: '',
        type: 'PAGAMENTO'
      });
      loadDays();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao realizar agendamento.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="bg-white dark:bg-zinc-800 p-12 rounded-[40px] shadow-2xl border dark:border-zinc-700 text-center max-w-lg w-full">
          <div className="bg-purple-100 dark:bg-purple-900/30 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-file-excel text-4xl text-purple-600"></i>
          </div>
          <h2 className="text-2xl font-black dark:text-white mb-4 uppercase tracking-tight">Conectar Planilha</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
            Para visualizar e realizar novos agendamentos, precisamos acessar a planilha do Google Sheets.
          </p>
          <button 
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-purple-500/20 transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-3"
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin text-xl"></i>
            ) : (
              <>
                <i className="fab fa-google text-xl"></i>
                <span className="uppercase tracking-widest">Autorizar Acesso</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <nav className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b dark:border-zinc-800 p-6 sticky top-[-32px] lg:top-[-48px] -mx-8 lg:-mx-12 -mt-8 lg:-mt-12 z-50 no-print mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-6">
            {onBack && (
              <button 
                onClick={onBack}
                className="text-gray-400 hover:text-purple-500 transition-colors p-2 -ml-2"
                title="Voltar ao Dashboard"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
            )}
            <div className="flex items-center space-x-2">
              <i className="fas fa-calendar-alt text-2xl text-purple-600"></i>
              <h1 className="text-xl font-bold tracking-tight dark:text-white">Agendamentos</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="text-xs font-bold text-gray-500 uppercase">Mês/Planilha:</label>
            <select 
              value={currentSheet}
              onChange={(e) => setCurrentSheet(e.target.value)}
              className="bg-gray-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-2 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            >
              {sheetNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button 
              onClick={loadDays}
              disabled={isLoading}
              className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Dias Disponíveis */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 dark:bg-zinc-800 animate-pulse rounded-3xl"></div>
              ))
            ) : days.length > 0 ? (
              days.map((day, idx) => (
                <div 
                  key={idx}
                  className={`p-6 rounded-3xl border transition-all ${
                    day.available 
                      ? 'bg-white dark:bg-zinc-800 border-gray-100 dark:border-zinc-700' 
                      : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{day.dayOfWeek}</p>
                      <h3 className="text-xl font-bold dark:text-white">{day.date}</h3>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      day.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {day.available ? 'Disponível' : 'Esgotado'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Total Ocupado:</span>
                      <span className="font-bold dark:text-white">{maskCurrency((day.totalValue * 100).toString())}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          (day.totalValue / day.maxLimit) > 0.8 ? 'bg-red-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${Math.min((day.totalValue / day.maxLimit) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                      <span>LIMITE: {maskCurrency((day.maxLimit * 100).toString())}</span>
                      <span>{Math.round((day.totalValue / day.maxLimit) * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400 font-bold uppercase tracking-widest">
                Nenhuma data de pagamento encontrada nesta aba.
              </div>
            )}
          </div>
        </div>

        {/* Formulário de Agendamento */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl shadow-sm border dark:border-zinc-700 sticky top-28">
            <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center">
              <i className="fas fa-calendar-plus mr-3 text-purple-600"></i>
              Novo Agendamento
            </h3>
            
            <form onSubmit={handleSaveAppointment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nome da Cliente</label>
                <input 
                  type="text"
                  required
                  value={newAppointment.clientName}
                  onChange={e => setNewAppointment(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="Nome Completo"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Valor do Plano</label>
                <input 
                  type="text"
                  required
                  value={newAppointment.planValue}
                  onChange={e => setNewAppointment(prev => ({ ...prev, planValue: maskCurrency(e.target.value.replace(/\D/g, '')) }))}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Data Cirurgia</label>
                  <input 
                    type="text"
                    required
                    value={newAppointment.surgeryDate}
                    onChange={e => setNewAppointment(prev => ({ ...prev, surgeryDate: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Data Pagamento</label>
                  <input 
                    type="text"
                    required
                    value={newAppointment.paymentDate}
                    onChange={e => setNewAppointment(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSaving || !accessToken}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none mt-4"
              >
                {isSaving ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  'AGENDAR NA PLANILHA'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;


