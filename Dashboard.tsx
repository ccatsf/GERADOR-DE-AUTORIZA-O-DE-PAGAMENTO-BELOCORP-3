import React from 'react';
import { User } from 'firebase/auth';

interface DashboardProps {
  user: User | null;
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  // Dados fictícios para os gráficos
  const appointmentData = [
    { day: 'Seg', count: 12 },
    { day: 'Ter', count: 18 },
    { day: 'Qua', count: 10 },
    { day: 'Qui', count: 22 },
    { day: 'Sex', count: 30 },
    { day: 'Sáb', count: 14 },
  ];

  const paymentData = [
    { month: 'Jan', value: 4200 },
    { month: 'Fev', value: 3100 },
    { month: 'Mar', value: 4500 },
    { month: 'Abr', value: 5800 },
    { month: 'Mai', value: 5200 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner Frase do Dia */}
      <div className="bg-purple-100 dark:bg-purple-900/30 p-8 rounded-3xl flex items-center space-x-6 relative overflow-hidden">
        <div className="bg-purple-600 text-white p-4 rounded-2xl z-10">
          <i className="fas fa-quote-right text-2xl"></i>
        </div>
        <div className="z-10">
          <h2 className="text-purple-900 dark:text-purple-200 text-2xl font-bold italic">
            "Foco, força e fé para conquistar seus objetivos hoje!"
          </h2>
          <p className="text-purple-500 dark:text-purple-400 text-sm font-semibold mt-1 tracking-wider uppercase">
            Frase do dia
          </p>
        </div>
        <div className="absolute right-0 top-0 text-purple-200 dark:text-purple-800/20 opacity-50 transform translate-x-1/4 -translate-y-1/4">
           <i className="fas fa-quote-right text-[180px]"></i>
        </div>
      </div>

      {/* Seção de Atividades */}
      <div>
        <h3 className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-sm mb-6">Atividades</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActivityCard 
            icon="fa-file-alt" 
            title="CRM - Captação de Docs" 
            color="text-purple-600" 
            bgColor="bg-purple-50"
            onClick={() => {}}
          />
          <ActivityCard 
            icon="fa-shield-alt" 
            title="Gerador de Autorização" 
            color="text-purple-600" 
            bgColor="bg-purple-50"
            onClick={() => onNavigate('payment')}
          />
          <ActivityCard 
            icon="fa-calendar-alt" 
            title="Agendamentos" 
            color="text-purple-600" 
            bgColor="bg-purple-50"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Gráficos e Calendário Secundário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Agendamentos */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-sm border dark:border-zinc-700">
          <h4 className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase mb-8">Quantidade de Agendamentos</h4>
          <div className="flex items-end justify-between h-48 px-2">
            {appointmentData.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center space-y-2 group w-full">
                <div 
                  className="bg-purple-500 w-8 rounded-lg transition-all duration-500 group-hover:bg-purple-600" 
                  style={{ height: `${(item.count / 30) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-400 font-medium">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Pagamentos */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-sm border dark:border-zinc-700">
          <h4 className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase mb-8">Pagamentos feitos ao mês</h4>
          <div className="relative h-48 flex items-end justify-between px-2">
            {/* Linha simplificada do gráfico */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path 
                d="M 0 70 L 25 85 L 50 60 L 75 40 L 100 55" 
                fill="none" 
                stroke="#8b5cf6" 
                strokeWidth="3" 
                strokeLinecap="round"
              />
              <circle cx="0" cy="70" r="2" fill="#8b5cf6" />
              <circle cx="25" cy="85" r="2" fill="#8b5cf6" />
              <circle cx="50" cy="60" r="2" fill="#8b5cf6" />
              <circle cx="75" cy="40" r="2" fill="#8b5cf6" />
              <circle cx="100" cy="55" r="2" fill="#8b5cf6" />
            </svg>
            {paymentData.map((item, idx) => (
              <span key={idx} className="text-xs text-gray-400 font-medium z-10">{item.month}</span>
            ))}
          </div>
        </div>

        {/* Calendário do Próximo Mês */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-sm border dark:border-zinc-700">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase">Próximo Mês</h4>
            <button className="text-purple-600 text-xs font-bold hover:underline">Ver Mais {'>'}</button>
          </div>
          <div className="text-center">
            <div className="flex justify-between items-center mb-4">
               <h5 className="font-bold dark:text-white">Março 2026</h5>
               <div className="flex space-x-2">
                 <button className="text-gray-400 hover:text-purple-600"><i className="fas fa-chevron-left text-xs"></i></button>
                 <button className="text-gray-400 hover:text-purple-600"><i className="fas fa-chevron-right text-xs"></i></button>
               </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
                <span key={d} className="text-[10px] text-gray-400 font-bold mb-2">{d}</span>
              ))}
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <div 
                  key={day} 
                  className={`aspect-square flex items-center justify-center text-xs rounded-lg cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors
                    ${day === 13 ? 'bg-purple-600 text-white font-bold' : 'dark:text-gray-300'}
                  `}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ActivityCardProps {
  icon: string;
  title: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ icon, title, color, bgColor, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-sm border dark:border-zinc-700 flex items-center space-x-4 hover:shadow-md transition-all group w-full text-left"
  >
    <div className={`${bgColor} ${color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
      <i className={`fas ${icon} text-xl`}></i>
    </div>
    <span className="font-bold text-gray-700 dark:text-gray-200 text-lg">{title}</span>
  </button>
);

export default Dashboard;
