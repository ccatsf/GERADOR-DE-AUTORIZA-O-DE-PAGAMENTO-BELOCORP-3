
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
      className={`${bgColorClass} ${borderClass} border p-3 rounded-xl shadow-sm hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 cursor-grab active:cursor-grabbing group transition-all duration-200 relative ${card.isDone ? 'opacity-70' : ''} ${isDragged ? 'opacity-50 scale-[0.98] ring-2 ring-purple-400 shadow-none' : ''}`}
    >
      {card.isDone && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-xl"></div>}

      <div className="flex justify-between items-start gap-2">
        <h3 className={`text-sm font-bold pr-6 w-full ${titleColor}`}>
          {card.title}
        </h3>
        <button 
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleDone}
          className={`shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10 ${card.isDone ? 'text-purple-600 dark:text-purple-400' : (isOverdue ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300' : 'text-slate-300 dark:text-slate-500 group-hover:text-purple-500 dark:hover:text-purple-400')}`}
          title={card.isDone ? "Marcar como pendente" : "Marcar como concluído"}
        >
           <HeartIcon solid={card.isDone} className="w-5 h-5" />
        </button>
      </div>
      
      {card.images.length > 0 && (
        <div className="mt-2.5 rounded-lg overflow-hidden h-28 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <img src={card.images[0]} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-col gap-2.5 mt-3">
        {card.planValue && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 w-fit px-2 py-1 rounded-md">
             <CurrencyDollarIcon className="w-4 h-4" />
             <span>{card.planValue}</span>
          </div>
        )}

        {hasChecklist && (
          <div className="flex items-center gap-2 text-xs">
            <div className={`flex items-center gap-1.5 font-medium ${isChecklistComplete ? 'text-emerald-600 dark:text-emerald-400' : (isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}`}>
              <CheckSquareIcon className="w-4 h-4" />
              <span>{completedChecklistItems}/{totalChecklistItems}</span>
            </div>
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-500 ${isChecklistComplete ? 'bg-emerald-500' : (isOverdue ? 'bg-red-500' : 'bg-purple-500')}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          {card.dueDate && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full font-bold text-xs ${dueDateColor}`}>
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>

        <div className="flex items-center -space-x-2">
          {card.labels.slice(0, 3).map(label => (
            <div key={label.id} className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" style={{ backgroundColor: label.color }} title={label.name} />
          ))}
        </div>
      </div>
    </div>
  );
}
