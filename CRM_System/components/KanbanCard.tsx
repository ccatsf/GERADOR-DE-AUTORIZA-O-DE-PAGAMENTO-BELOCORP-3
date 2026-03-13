
import React from 'react';
import { CardType, Id } from '../types';
import { CheckSquareIcon, ImageIcon, HeartIcon, CalendarIcon, CurrencyDollarIcon } from './Icons';

// Add key to Props to avoid TS errors in list rendering
interface KanbanCardProps {
  key?: Id;
  card: CardType;
  isDragged?: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  updateCard: (cardId: Id, updates: Partial<CardType>) => void;
  onDelete: () => void;
}

export default function KanbanCard({ card, isDragged, onClick, onDragStart, onDragEnd, updateCard, onDelete }: KanbanCardProps) {
  
  const totalChecklistItems = card.checklists.reduce((acc, cl) => acc + cl.items.length, 0);
  const completedChecklistItems = card.checklists.reduce(
    (acc, cl) => acc + cl.items.filter(item => item.isCompleted).length,
    0
  );
  const hasChecklist = totalChecklistItems > 0;
  const isChecklistComplete = hasChecklist && totalChecklistItems === completedChecklistItems;
  const progressPercent = totalChecklistItems === 0 ? 0 : Math.round((completedChecklistItems / totalChecklistItems) * 100);

  const toggleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateCard(card.id, { isDone: !card.isDone });
  };

  let dueDateColor = 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';
  let formattedDate = '';
  let isOverdue = false;

  if (card.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = card.dueDate.split('-').map(Number);
    const due = new Date(year, month - 1, day);
    
    formattedDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(due);
    
    if (!card.isDone && due < today) {
       isOverdue = true;
    }

    if (card.isDone) {
      dueDateColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50';
    } else if (isOverdue) {
      dueDateColor = 'text-white bg-red-600 dark:bg-red-700 font-bold';
    } else if (due.getTime() === today.getTime()) {
      dueDateColor = 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 font-bold';
    } else {
      dueDateColor = 'text-slate-600 dark:text-slate-300 bg-black/5 dark:bg-white/10';
    }
  }

  let bgColorClass = card.cardColor || 'bg-white dark:bg-slate-800';
  let borderClass = 'border-slate-200 dark:border-slate-400';
  let titleColor = card.isDone ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200';

  if (isOverdue) {
     bgColorClass = 'bg-red-50 dark:bg-red-950/50';
     borderClass = 'border-red-400 dark:border-red-500 shadow-red-200 dark:shadow-red-900/20 shadow-md';
     titleColor = 'text-red-900 dark:text-red-400 font-extrabold';
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e);
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`${bgColorClass} ${borderClass} border-2 p-3 rounded-xl shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group transition-all duration-200 relative ${card.isDone ? 'opacity-75 bg-blend-overlay bg-slate-50 dark:bg-slate-900' : ''} ${isDragged ? 'opacity-40 scale-[0.98] ring-4 ring-rose-400/60 shadow-none grayscale-[30%]' : ''}`}
    >
  

      <div className="flex justify-between items-start gap-2">
        <h3 className={`text-sm font-bold pr-6 w-full ${titleColor}`}>
          {card.title}
        </h3>
      </div>
      
      {/* Barra de Progresso do Checklist */}
      {hasChecklist && (
        <div className="mt-2 mb-1 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {card.planValue && (
        <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 w-fit px-2 py-1 rounded-md">
           <CurrencyDollarIcon className="w-3.5 h-3.5" />
           {card.planValue}
        </div>
      )}

      {card.images.length > 0 && (
        <div className="mt-3 rounded-lg overflow-hidden h-24 bg-rose-50 dark:bg-slate-800 border border-rose-100 dark:border-slate-700">
          <img src={card.images[0]} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          
          {card.dueDate && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${dueDateColor}`}>
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          )}

          {hasChecklist && (
            <div className={`flex items-center gap-1 ${isChecklistComplete ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded font-medium' : (isOverdue ? 'text-red-700 dark:text-red-400' : '')}`}>
              <CheckSquareIcon className="w-4 h-4" />
              <span>{completedChecklistItems}/{totalChecklistItems}</span>
            </div>
          )}
          
          {card.images.length > 0 && (
             <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-700 dark:text-red-400' : ''}`}>
               <ImageIcon className="w-4 h-4" />
               <span>{card.images.length}</span>
             </div>
          )}
        </div>

        <button 
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleDone}
          className={`shrink-0 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${card.isDone ? 'text-rose-500 dark:text-rose-400' : (isOverdue ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300' : 'text-slate-300 dark:text-slate-600 hover:text-rose-400 dark:hover:text-rose-400')}`}
          title={card.isDone ? "Marcar como pendente" : "Marcar como feito"}
        >
           <HeartIcon solid={card.isDone} className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
