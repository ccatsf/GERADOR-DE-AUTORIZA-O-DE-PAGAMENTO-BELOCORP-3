
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
      className={`shrink-0 h-full bg-rose-100/40 dark:bg-slate-900/50 rounded-2xl flex flex-col border border-rose-200 dark:border-slate-800 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-80'}`}
    >
      {/* Cabeçalho */}
      <div className={`p-4 flex flex-col transition-colors rounded-t-2xl gap-2 ${list.theme || 'bg-rose-100 dark:bg-slate-800'} ${isCollapsed ? 'items-center px-2' : ''}`}>
        
        <div className="flex items-center justify-between w-full">
          {!isCollapsed ? (
            <>
              <input 
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                   if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="flex-1 min-w-0 font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-500 rounded px-1.5 py-0.5 -ml-1.5 transition-all truncate"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={toggleCollapse}
                  className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors text-slate-600 dark:text-slate-400"
                  title="Recolher coluna"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors"
                  title="Excluir coluna"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={toggleCollapse}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors text-slate-600 dark:text-slate-400 mx-auto"
              title="Expandir coluna"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-white/40 dark:bg-black/20 p-1 rounded-full border border-white/20">
              <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-red-400' }); }} className="w-3 h-3 bg-red-400 rounded-full border border-white shadow-sm hover:scale-125 transition-transform" />
              <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-yellow-400' }); }} className="w-3 h-3 bg-yellow-400 rounded-full border border-white shadow-sm hover:scale-125 transition-transform" />
              <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-emerald-400' }); }} className="w-3 h-3 bg-emerald-400 rounded-full border border-white shadow-sm hover:scale-125 transition-transform" />
              <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-blue-400' }); }} className="w-3 h-3 bg-blue-400 rounded-full border border-white shadow-sm hover:scale-125 transition-transform" />
              <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-purple-400' }); }} className="w-3 h-3 bg-purple-400 rounded-full border border-white shadow-sm hover:scale-125 transition-transform" />
              <button onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: 'bg-rose-400' }); }} className="w-3 h-3 bg-rose-400 rounded-full border border-white shadow-sm hover:scale-125 transition-transform" />
            </div>
            <span className="text-[10px] font-bold text-slate-600/60 dark:text-slate-400/60 uppercase">{cards.length} clientes</span>
          </div>
        )}
      </div>

      {/* Título Vertical quando recolhido */}
      {isCollapsed && (
        <div className="flex-1 flex items-center justify-center p-2 overflow-hidden cursor-pointer" onClick={toggleCollapse}>
          <span className="whitespace-nowrap font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-sm rotate-90 origin-center">
            {localTitle}
          </span>
        </div>
      )}

      {/* Conteúdo da Coluna com Scroll Interno */}
      {!isCollapsed && (
        <>
          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
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
          
          <div className="p-3 pt-0 mt-auto">
            <button 
              onClick={() => onAddCard(list.id, 'Novo Cliente')}
              className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-100/50 rounded-xl transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> 
              <span>Adicionar Cliente</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
