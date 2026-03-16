
import React, { useState, useEffect } from 'react';
import { ListType, CardType, Id, DragItem } from '../types';
import { TrashIcon, PlusIcon } from './Icons';
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

// Miro-style column color palettes
const COLUMN_PALETTES = [
  { id: 'rose',    bg: '#fce7f3', header: '#f9a8d4', text: '#9d174d', dot: '#ec4899' },
  { id: 'violet',  bg: '#ede9fe', header: '#c4b5fd', text: '#5b21b6', dot: '#7c3aed' },
  { id: 'sky',     bg: '#e0f2fe', header: '#7dd3fc', text: '#0c4a6e', dot: '#0284c7' },
  { id: 'emerald', bg: '#d1fae5', header: '#6ee7b7', text: '#064e3b', dot: '#059669' },
  { id: 'amber',   bg: '#fef3c7', header: '#fcd34d', text: '#78350f', dot: '#d97706' },
  { id: 'slate',   bg: '#f1f5f9', header: '#cbd5e1', text: '#1e293b', dot: '#64748b' },
];

function getPalette(theme?: string) {
  return COLUMN_PALETTES.find(p => p.id === theme) || COLUMN_PALETTES[0];
}

export default function KanbanColumn({ 
  list, cards, draggedItem,
  onAddCard, onCardClick, onDragStart, onDropOnList, onDragOver, onDragEnd,
  updateCard, deleteCard, updateList, deleteList 
}: Props) {
  const [localTitle, setLocalTitle] = useState(list.title);
  const [isDragOver, setIsDragOver] = useState(false);
  const palette = getPalette(list.theme);

  useEffect(() => { setLocalTitle(list.title); }, [list.title]);

  const handleTitleBlur = () => {
    if (localTitle.trim() !== list.title)
      updateList(list.id, { title: localTitle.trim() || 'Novo Quadro' });
  };

  const handleDragOver = (e: React.DragEvent) => {
    onDragOver(e);
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDropOnList(e, list.id);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, { type: 'BOARD', id: list.id })}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      style={{ backgroundColor: palette.bg, borderColor: isDragOver ? palette.dot : 'transparent' }}
      className={`flex flex-col rounded-3xl border-2 transition-all duration-200 shadow-sm min-w-[280px] max-w-full`}
    >
      {/* Column Header */}
      <div
        style={{ backgroundColor: palette.header }}
        className="rounded-t-3xl px-4 pt-4 pb-3"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            style={{ color: palette.text }}
            className="flex-1 min-w-0 font-extrabold text-sm uppercase tracking-wide bg-transparent outline-none focus:bg-white/50 rounded px-1 py-0.5 -ml-1 transition-all truncate"
          />
          <button
            onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
            style={{ color: palette.text }}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-60 hover:opacity-100 shrink-0"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Color dots + count */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {COLUMN_PALETTES.map(p => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); updateList(list.id, { theme: p.id }); }}
                style={{ backgroundColor: p.dot }}
                className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 ${list.theme === p.id ? 'ring-2 ring-offset-1 ring-white/80' : ''}`}
              />
            ))}
          </div>
          <span style={{ color: palette.text }} className="text-xs font-bold opacity-60">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="p-3 space-y-2.5 flex-1 overflow-y-auto min-h-[80px]">
        {cards.map(card => (
          <KanbanCard
            key={card.id}
            card={card}
            columnPalette={palette}
            isDragged={draggedItem?.type === 'CARD' && draggedItem.id === card.id}
            onClick={() => onCardClick(card.id)}
            onDragStart={(e) => onDragStart(e, { type: 'CARD', id: card.id, listId: list.id })}
            onDragEnd={onDragEnd}
            updateCard={updateCard}
            onDelete={() => deleteCard(card.id)}
          />
        ))}
      </div>

      {/* Add button */}
      <div className="px-3 pb-3 pt-1">
        <button
          onClick={() => onAddCard(list.id, 'Novo Cliente')}
          style={{ color: palette.text, borderColor: palette.header }}
          className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold border-2 border-dashed rounded-2xl hover:bg-black/5 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Adicionar Cliente
        </button>
      </div>
    </div>
  );
}
