import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from './firebase';
import { generateDailyQuote } from './services/geminiService';
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
  const [dailyQuote, setDailyQuote] = useState('Foco, força e fé para conquistar seus objetivos hoje!');

  useEffect(() => {
    const fetchQuote = async () => {
      const today = new Date().toDateString();
      const cachedQuote = localStorage.getItem('daily_quote');
      const cachedDate = localStorage.getItem('daily_quote_date');

      if (cachedQuote && cachedDate === today) {
        setDailyQuote(cachedQuote);
      } else {
        const quote = await generateDailyQuote();
        setDailyQuote(quote);
        localStorage.setItem('daily_quote', quote);
        localStorage.setItem('daily_quote_date', today);
      }
    };
    fetchQuote();
  }, []);

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
            "{dailyQuote}"
          </h2>
          <p className="text-purple-500 dark:text-purple-400 text-sm font-semibold mt-1 tracking-wider uppercase">
            Frase do dia
          </p>
        </div>
        <div className="absolute right-0 top-0 text-purple-200 dark:text-purple-800/20 opacity-50 transform translate-x-1/4 -translate-y-1/4">
           <i className="fas fa-quote-right text-[180px]"></i>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Lista de Afazeres */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-sm">Lista de Afazeres Diários</h3>
            <button 
              onClick={() => setIsAddingTodo(true)}
              className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-full shadow-sm border dark:border-zinc-700 flex items-center justify-center text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl shadow-sm border dark:border-zinc-700 min-h-[300px] flex flex-col">
            {isAddingTodo && (
              <form onSubmit={handleAddTodo} className="mb-6 flex gap-3">
                <input 
                  autoFocus
                  type="text" 
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="O que precisa ser feito?"
                  className="flex-1 bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                />
                <button type="submit" className="bg-purple-600 text-white px-6 rounded-2xl font-bold hover:bg-purple-700 transition-colors">OK</button>
              </form>
            )}

            {todos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-60 py-10">
                <i className="fas fa-tasks text-4xl mb-4"></i>
                <p className="font-bold uppercase tracking-widest text-xs">Nenhuma tarefa para hoje</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todos.map(todo => (
                  <div key={todo.id} className="flex items-center justify-between group">
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => toggleTodo(todo)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-zinc-600 hover:border-purple-500'}`}
                      >
                        {todo.completed && <i className="fas fa-check text-[10px]"></i>}
                      </button>
                      <span className={`font-bold ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>{todo.text}</span>
                    </div>
                    <button onClick={() => deleteTodo(todo.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Atividades Administrativas */}
        <div className="space-y-6">
          <h3 className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-sm">Atividades Administrativas</h3>
          <div className="grid grid-cols-1 gap-4">
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
              onClick={() => onNavigate('generator')}
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
    </div>
  );
};

export default Dashboard;
