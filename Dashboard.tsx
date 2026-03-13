import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: any;
}

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

interface DashboardProps {
  user: User | null;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isAddingTodo, setIsAddingTodo] = useState(false);

  // Escutar tarefas do Firebase (Compartilhadas para toda a equipe ADM)
  useEffect(() => {
    const q = query(
      collection(db, 'todos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todoList: TodoItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        todoList.push({ 
          id: doc.id, 
          text: data.text,
          completed: data.completed,
          createdAt: data.createdAt
        } as TodoItem);
      });
      setTodos(todoList);
    }, (error) => {
      console.error("Erro no Firestore Snapshot:", error);
      // Se der erro de índice, tentamos sem o orderBy
      const simpleQ = query(collection(db, 'todos'));
      onSnapshot(simpleQ, (snap) => {
        const list: TodoItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as TodoItem));
        setTodos(list);
      });
    });

    return () => unsubscribe();
  }, []);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await addDoc(collection(db, 'todos'), {
        text: newTodo,
        completed: false,
        createdAt: serverTimestamp()
      });
      setNewTodo('');
      setIsAddingTodo(false);
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      alert("Erro ao salvar tarefa. Verifique sua conexão.");
    }
  };

  const toggleTodo = async (todo: TodoItem) => {
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        completed: !todo.completed
      });
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      console.error("Erro ao deletar tarefa:", error);
    }
  };

  return (
    <div className="space-y-8 pb-10">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Afazeres e Atividades */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Container da Lista de Afazeres */}
          <div className="bg-gray-50/50 dark:bg-zinc-900/30 p-8 rounded-[40px] border border-gray-100 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-sm">Lista de Afazeres Diários</h3>
              <button 
                onClick={() => setIsAddingTodo(!isAddingTodo)}
                className="w-10 h-10 bg-white dark:bg-zinc-800 text-purple-600 rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform border border-gray-100 dark:border-zinc-700"
              >
                <i className={`fas ${isAddingTodo ? 'fa-times' : 'fa-plus'}`}></i>
              </button>
            </div>

            <div className="space-y-4">
              {isAddingTodo && (
                <form onSubmit={handleAddTodo} className="mb-6 animate-fadeIn">
                  <input 
                    autoFocus
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="Escreva uma nova tarefa..."
                    className="w-full bg-white dark:bg-zinc-800 p-5 rounded-[25px] border border-gray-100 dark:border-zinc-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white font-bold"
                  />
                </form>
              )}

              {todos.map((todo) => (
                <div 
                  key={todo.id}
                  className={`group flex items-center justify-between p-5 rounded-[25px] transition-all cursor-pointer ${
                    todo.completed 
                      ? 'bg-gray-100/50 dark:bg-zinc-800/40 opacity-60' 
                      : 'bg-white dark:bg-zinc-800 shadow-sm border border-gray-50 dark:border-zinc-700 hover:border-purple-200'
                  }`}
                  onClick={() => toggleTodo(todo)}
                >
                  <div className="flex items-center space-x-5 flex-1">
                    {/* Caixa Selecionável (Círculo Checkbox) */}
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      todo.completed 
                        ? 'bg-purple-500 border-purple-500 text-white' 
                        : 'border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                    }`}>
                      {todo.completed && <i className="fas fa-check text-xs"></i>}
                    </div>
                    
                    <span className={`text-gray-700 dark:text-gray-200 font-bold text-lg ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                      {todo.text}
                    </span>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              ))}

              {todos.length === 0 && !isAddingTodo && (
                <div className="text-center py-10">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhuma tarefa para hoje</p>
                </div>
              )}
            </div>
          </div>

          {/* Cards de Atividades */}
          <div className="space-y-6">
            <h3 className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-sm">Atividades Administrativas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActivityCard 
                icon="fa-file-alt" 
                title="CRM - Captação de Docs" 
                color="text-purple-600" 
                bgColor="bg-purple-50"
                onClick={() => onNavigate('crm')}
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
                onClick={() => onNavigate('appointments')}
              />
            </div>
          </div>
        </div>

        {/* Lado Direito: Calendário */}
        <div className="lg:col-span-1">
          <h3 className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-sm mb-6">Calendário</h3>
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-sm border dark:border-zinc-700">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase">Próximo Mês</h4>
              <button className="text-purple-600 text-xs font-bold hover:underline">Ver Mais</button>
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
    </div>
  );
};

export default Dashboard;
