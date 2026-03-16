
import React, { useState, useEffect } from 'react';
import { ListType, CardType, Id, DragItem } from '../types';
import { TrashIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import KanbanCard from './KanbanCard';

interface Props {
  key?: Id;
  list: ListType;
  cards: CardType[];
  draggedItem: DragItem | null;
  onAddCard: (listId: Id, title: string) => void;
  onCardClick: (id: Id) => void;
  onDragStart: (e: React.DragEvent, item: DragItem) => void;
  onDropOnList: (e: React.DragEvent, targetListId: Id) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  updateCard: (cardId: Id, updates: Partial<CardType>) => void;
  deleteCard: (cardId: Id) => void;
  updateList: (listId: Id, updates: Partial<ListType>) => void;
  deleteList: (id: Id) => void;
}

export default function KanbanColumn({ 
  list, 
  cards, 
  draggedItem,
  onAddCard, 
  onCardClick, 
  onDragStart, 
  onDropOnList,
  onDragOver,
  onDragEnd,
  updateCard,
  deleteCard,
  updateList,
  deleteList 
}: Props) {
  
  const [localTitle, setLocalTitle] = useState(list.title);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setLocalTitle(list.title);
  }, [list.title]);

  const handleTitleBlur = () => {
    if (localTitle.trim() !== list.title) {
      updateList(list.id, { title: localTitle.trim() || 'Novo Quadro' });
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, { type: 'BOARD', id: list.id })}
      onDragOver={onDragOver}
      onDrop={(e) => onDropOnList(e, list.id)}
      className={`flex-1 min-w-[300px] max-w-full bg-slate-50 dark:bg-slate-900/70 rounded-2xl flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 ease-in-out`}
    >
      {/* Cabeçalho */}
      <div className={`p-3.5 flex flex-col transition-colors rounded-t-2xl gap-2 border-b-2 ${list.theme ? list.theme.replace('bg', 'border') : 'border-slate-300 dark:border-slate-700'}`}>
        
        <div className="flex items-center justify-between w-full">
          <input 
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
               if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="flex-1 min-w-0 font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-500 rounded px-1.5 py-0.5 -ml-1.5 transition-all truncate"
          />
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors"
              title="Excluir coluna"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 p-1 rounded-full">
            <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-red-200' }); }} className="w-4 h-4 bg-red-300 rounded-full border-2 border-white dark:border-slate-900 shadow-sm hover:scale-110 transition-transform" />
            <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-yellow-200' }); }} className="w-4 h-4 bg-yellow-300 rounded-full border-2 border-white dark:border-slate-900 shadow-sm hover:scale-110 transition-transform" />
            <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-emerald-200' }); }} className="w-4 h-4 bg-emerald-300 rounded-full border-2 border-white dark:border-slate-900 shadow-sm hover:scale-110 transition-transform" />
            <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-blue-200' }); }} className="w-4 h-4 bg-blue-300 rounded-full border-2 border-white dark:border-slate-900 shadow-sm hover:scale-110 transition-transform" />
            <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-purple-200' }); }} className="w-4 h-4 bg-purple-300 rounded-full border-2 border-white dark:border-slate-900 shadow-sm hover:scale-110 transition-transform" />
            <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-rose-200' }); }} className="w-4 h-4 bg-rose-300 rounded-full border-2 border-white dark:border-slate-900 shadow-sm hover:scale-110 transition-transform" />
          </div>
          <span className="text-xs font-bold text-slate-500/80 dark:text-slate-400/80 uppercase tracking-wider">{cards.length} clientes</span>
        </div>
      </div>

      {/* Conteúdo da Coluna com Scroll Interno */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto min-h-[100px]">
        {cards.map(card => (
          <KanbanCard 
            key={card.id} 
            card={card} 
            isDragged={draggedItem?.type === 'CARD' && draggedItem.id === card.id}
            onClick={() => onCardClick(card.id)}
            onDragStart={(e) => onDragStart(e, { type: 'CARD', id: card.id, listId: list.id })}
            onDragEnd={onDragEnd}
            updateCard={updateCard}
            onDelete={() => deleteCard(card.id)}
          />
        ))}
      </div>
      
      <div className="p-3 pt-2 mt-auto border-t border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => onAddCard(list.id, 'Novo Cliente')}
          className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" /> 
          <span>Adicionar Cliente</span>
        </button>
      </div>
    </div>
  );
}
