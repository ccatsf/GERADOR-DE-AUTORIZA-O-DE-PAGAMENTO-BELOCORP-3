
import React from 'react';
import { CardType, Id } from '../types';
import { CheckSquareIcon, HeartIcon, CalendarIcon, CurrencyDollarIcon } from './Icons';

interface ColumnPalette {
  bg: string; header: string; text: string; dot: string;
}

interface KanbanCardProps {
  key?: Id;
  card: CardType;
  columnPalette: ColumnPalette;
  isDragged?: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  updateCard: (cardId: Id, updates: Partial<CardType>) => void;
  onDelete: () => void;
}

export default function KanbanCard({ card, columnPalette, isDragged, onClick, onDragStart, onDragEnd, updateCard }: KanbanCardProps) {
  const totalItems = card.checklists.reduce((a, cl) => a + cl.items.length, 0);
  const doneItems  = card.checklists.reduce((a, cl) => a + cl.items.filter(i => i.isCompleted).length, 0);
  const progress   = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);
  const allDone    = totalItems > 0 && doneItems === totalItems;

  let isOverdue = false;
  let formattedDate = '';
  if (card.dueDate && !card.isDone) {
    const today = new Date(); today.setHours(0,0,0,0);
    const [y,m,d] = card.dueDate.split('-').map(Number);
    const due = new Date(y, m-1, d);
    isOverdue = due < today;
    formattedDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(due);
  } else if (card.dueDate) {
    const [y,m,d] = card.dueDate.split('-').map(Number);
    formattedDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(y,m-1,d));
  }

  const toggleDone = (e: React.MouseEvent) => { e.stopPropagation(); updateCard(card.id, { isDone: !card.isDone }); };

  // Card background: use cardColor if set, else white
  const cardBg = card.cardColor && !card.cardColor.includes('bg-white') ? undefined : '#ffffff';

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(e); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{ backgroundColor: cardBg, opacity: isDragged ? 0.5 : 1 }}
      className={`
        relative rounded-2xl p-3.5 cursor-grab active:cursor-grabbing
        border transition-all duration-150 group
        ${isOverdue ? 'border-red-400 shadow-red-100 shadow-md' : 'border-white/80 hover:border-white shadow-sm hover:shadow-md'}
        ${card.isDone ? 'opacity-60' : ''}
        ${isDragged ? 'ring-2 ring-purple-400 scale-[0.97]' : ''}
        ${!cardBg ? card.cardColor : ''}
      `}
    >
      {/* Done overlay */}
      {card.isDone && <div className="absolute inset-0 bg-white/40 rounded-2xl pointer-events-none" />}

      {/* Labels strip */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map(label => (
            <span key={label.id} className={`${label.color} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
              {label.text}
            </span>
          ))}
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-sm font-bold leading-snug flex-1 ${card.isDone ? 'line-through text-slate-400' : isOverdue ? 'text-red-700' : 'text-slate-800'}`}>
          {card.title}
        </h3>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleDone}
          className={`shrink-0 p-1 rounded-full transition-colors z-10 ${card.isDone ? 'text-rose-500' : 'text-slate-300 group-hover:text-rose-400'}`}
          title={card.isDone ? 'Desmarcar' : 'Marcar como feito'}
        >
          <HeartIcon solid={card.isDone} className="w-4 h-4" />
        </button>
      </div>

      {/* Cover image */}
      {card.images.length > 0 && (
        <div className="mt-2.5 rounded-xl overflow-hidden h-24 bg-slate-100">
          <img src={card.images[0]} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {card.planValue && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            <CurrencyDollarIcon className="w-3 h-3" />{card.planValue}
          </span>
        )}
        {card.dueDate && (
          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
            card.isDone ? 'bg-emerald-100 text-emerald-700' :
            isOverdue   ? 'bg-red-500 text-white' :
                          'bg-slate-100 text-slate-600'
          }`}>
            <CalendarIcon className="w-3 h-3" />{formattedDate}
          </span>
        )}
      </div>

      {/* Checklist progress */}
      {totalItems > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className={`text-[10px] font-bold ${allDone ? 'text-emerald-600' : 'text-slate-500'}`}>
            <CheckSquareIcon className="w-3 h-3 inline mr-0.5" />{doneItems}/{totalItems}
          </span>
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${allDone ? 'bg-emerald-500' : isOverdue ? 'bg-red-400' : 'bg-rose-400'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
