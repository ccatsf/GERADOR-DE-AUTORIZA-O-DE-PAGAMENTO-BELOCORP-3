import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useLocalStorage } from './hooks/useLocalStorage';
import { CardType, ListType, Id, DragItem, QueueItem, Label, Workspace } from './types';
import { INITIAL_LISTS, INITIAL_CARDS, DEFAULT_LABELS, generateId } from './constants';
import { SearchIcon, HeartIcon, PlusIcon, DocumentTextIcon, XIcon, BellIcon, SunIcon, MoonIcon, UndoIcon, RedoIcon, ClipboardListIcon, ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, CheckSquareIcon, TrashIcon, ImageIcon, MenuIcon, PencilIcon, ChartPieIcon } from './components/Icons';
import KanbanColumn from './components/KanbanColumn';
import CardDetailsModal from './components/CardDetailsModal';

interface NotificationItem {
  id: string;
  cardId: Id;
  title: string;
  message: string;
  type: 'warning' | 'overdue';
}

interface BoardState {
  lists: ListType[];
  cards: CardType[];
}

interface CRMProps {
  onBack: () => void;
}

export default function CRM({ onBack }: CRMProps) {
  const [lists, setLists] = useLocalStorage<ListType[]>('crm-lists', INITIAL_LISTS);
  const [cards, setCards] = useState<CardType[]>([]);
  const [workspaces, setWorkspaces] = useLocalStorage<Workspace[]>('crm-workspaces', [{ id: 'default', name: 'Controle Principal' }]);

  // Sincronizar cards com Firebase
  useEffect(() => {
    const q = query(collection(db, 'crm-cards'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseCards: CardType[] = [];
      snapshot.forEach((doc) => {
        firebaseCards.push({ id: doc.id, ...doc.data() } as CardType);
      });
      setCards(firebaseCards);
    });
    return () => unsubscribe();
  }, []);

  const saveCardToFirebase = async (card: CardType) => {
    const { id, ...data } = card;
    await setDoc(doc(db, 'crm-cards', id.toString()), data);
  };

  const deleteCardFromFirebase = async (cardId: Id) => {
    await deleteDoc(doc(db, 'crm-cards', cardId.toString()));
  };

  const [activeWorkspaceId, setActiveWorkspaceId] = useLocalStorage<string>('crm-active-workspace', 'default');
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const notesKey = activeWorkspaceId === 'default' ? 'crm-notes' : `crm-notes-${activeWorkspaceId}`;
  const queueKey = activeWorkspaceId === 'default' ? 'crm-queue' : `crm-queue-${activeWorkspaceId}`;
  const [globalNotes, setGlobalNotes] = useLocalStorage<string>(notesKey, '');
  const [contractQueue, setContractQueue] = useLocalStorage<QueueItem[]>(queueKey, []);
  
  const [labels, setLabels] = useLocalStorage<Label[]>('crm-labels', DEFAULT_LABELS);
  const [theme, setTheme] = useState('light');
  const [backgroundImage, setBackgroundImage] = useLocalStorage<string | null>('crm-bg', null);
  
  const [isWallpaperMenuOpen, setIsWallpaperMenuOpen] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const wallpaperMenuRef = useRef<HTMLDivElement>(null);

  const [past, setPast] = useState<BoardState[]>([]);
  const [future, setFuture] = useState<BoardState[]>([]);
  
  useEffect(() => {
    setPast([]);
    setFuture([]);
  }, [activeWorkspaceId]);

  const currentStateRef = useRef<BoardState>({ lists, cards });
  useEffect(() => {
    currentStateRef.current = { lists, cards };
  }, [lists, cards]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCardId, setActiveCardId] = useState<Id | null>(null);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  
  const [activeSidebar, setActiveSidebar] = useState<'none' | 'notes' | 'queue' | 'dashboard'>('none');
  const [expandedQueueItemId, setExpandedQueueItemId] = useState<string | null>(null);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [newQueueText, setNewQueueText] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wallpaperMenuRef.current && !wallpaperMenuRef.current.contains(event.target as Node)) {
        setIsWallpaperMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string);
      setIsWallpaperMenuOpen(false);
    };
    reader.readAsDataURL(file);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const createNewWorkspace = () => {
    const name = prompt("Nome do novo mês:");
    if (!name) return;
    
    const newId = Date.now().toString();
    const newWS: Workspace = { id: newId, name: name, createdAt: Date.now() };
    
    setWorkspaces([...workspaces, newWS]);
    setActiveWorkspaceId(newId);
    setIsWorkspaceMenuOpen(false);
  };

  const deleteWorkspace = (id: string) => {
    if (workspaces.length > 1) {
      setWorkspaces(prev => prev.filter(ws => ws.id !== id));
      if (activeWorkspaceId === id) {
        const remaining = workspaces.find(ws => ws.id !== id);
        setActiveWorkspaceId(remaining?.id || 'default');
      }
    }
  };

  const takeSnapshot = useCallback(() => {
    setPast(prev => [...prev.slice(-49), currentStateRef.current]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast(prevPast => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, -1);
      setFuture(prevFuture => [currentStateRef.current, ...prevFuture]);
      setLists(previous.lists);
      setCards(previous.cards);
      return newPast;
    });
  }, [setLists, setCards]);

  const redo = useCallback(() => {
    setFuture(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);
      setPast(prevPast => [...prevPast, currentStateRef.current]);
      setLists(next.lists);
      setCards(next.cards);
      return newFuture;
    });
  }, [setLists, setCards]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const lowerQuery = searchQuery.toLowerCase();
    return cards.filter(card => 
      card.title.toLowerCase().includes(lowerQuery) || 
      (card.description && card.description.toLowerCase().includes(lowerQuery))
    );
  }, [cards, searchQuery]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const alerts: NotificationItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    cards.forEach(card => {
      if (card.dueDate && !card.isDone) {
        const [y, m, d] = card.dueDate.split('-').map(Number);
        const due = new Date(y, m - 1, d);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          alerts.push({ id: `err-${card.id}`, cardId: card.id, title: card.title, message: `Prazo ultrapassado há ${Math.abs(diffDays)} dia(s)!`, type: 'overdue' });
        } else if (diffDays <= 7) {
          alerts.push({ id: `warn-${card.id}`, cardId: card.id, title: card.title, message: diffDays === 0 ? `O prazo é hoje!` : `Faltam ${diffDays} dia(s) para o prazo.`, type: 'warning' });
        }
      }
    });
    return alerts.sort((a, b) => (a.type === 'overdue' && b.type !== 'overdue' ? -1 : 1));
  }, [cards]);

  const dashboardStats = useMemo(() => {
    let totalDocs = 0;
    let completedDocs = 0;
    cards.forEach(card => card.checklists.forEach(cl => {
      totalDocs += cl.items.length;
      completedDocs += cl.items.filter(item => item.isCompleted).length;
    }));
    const percent = totalDocs === 0 ? 0 : Math.round((completedDocs / totalDocs) * 100);
    const strokeDashoffset = 251.2 - (251.2 * percent) / 100;
    return { totalDocs, completedDocs, percent, strokeDashoffset };
  }, [cards]);

  const addLabel = useCallback((labelData: Omit<Label, 'id'>) => {
    takeSnapshot();
    setLabels(prev => [...prev, { ...labelData, id: generateId() }]);
  }, [setLabels, takeSnapshot]);

  const updateLabel = useCallback((id: string, updates: Partial<Label>) => {
    takeSnapshot();
    setLabels(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    setCards(prev => prev.map(c => ({
      ...c,
      labels: c.labels.map(l => l.id === id ? { ...l, ...updates } : l)
    })));
  }, [setLabels, setCards, takeSnapshot]);

  const deleteLabel = useCallback((id: string) => {
    takeSnapshot();
    setLabels(prev => prev.filter(l => l.id !== id));
    setCards(prev => prev.map(c => ({
      ...c,
      labels: c.labels.filter(l => l.id !== id)
    })));
  }, [setLabels, setCards, takeSnapshot]);

  const addQueueItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueText.trim()) return;
    setContractQueue(prev => [...prev, { id: generateId(), text: newQueueText.trim(), isDone: false }]);
    setNewQueueText('');
  };

  const toggleQueueItem = (id: string) => setContractQueue(prev => prev.map(item => item.id === id ? { ...item, isDone: !item.isDone } : item));
  const deleteQueueItem = (id: string) => { setContractQueue(prev => prev.filter(item => item.id !== id)); if (expandedQueueItemId === id) setExpandedQueueItemId(null); };
  const updateQueueItem = (id: string, updates: Partial<QueueItem>) => setContractQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const moveQueueItem = (index: number, direction: 'up' | 'down') => {
    setContractQueue(prev => {
      const newQueue = [...prev];
      if (direction === 'up' && index > 0) [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
      else if (direction === 'down' && index < newQueue.length - 1) [newQueue[index + 1], newQueue[index]] = [newQueue[index], newQueue[index + 1]];
      return newQueue;
    });
  };

  const addList = () => { takeSnapshot(); setLists(prev => [...prev, { id: generateId(), title: "Novo Quadro", theme: 'bg-purple-100' }]); };
  const updateList = useCallback((listId: Id, updates: Partial<ListType>) => { takeSnapshot(); setLists(prev => prev.map(l => l.id === listId ? { ...l, ...updates } : l)); }, [setLists, takeSnapshot]);
  const deleteList = useCallback((listId: Id) => { takeSnapshot(); setLists(prev => prev.filter(l => l.id !== listId)); setCards(prev => prev.filter(c => c.listId !== listId)); }, [setLists, setCards, takeSnapshot]);

  const addCard = useCallback((listId: Id, title: string) => {
    takeSnapshot();
    const newId = generateId();
    const newCard = { 
      id: newId, 
      listId, 
      title, 
      description: '', 
      labels: [], 
      checklists: [], 
      images: [], 
      isDone: false, 
      cardColor: 'bg-white dark:bg-slate-800', 
      createdAt: Date.now() 
    };
    saveCardToFirebase(newCard);
    setActiveCardId(newId);
  }, [takeSnapshot]);

  const updateCard = useCallback((cardId: Id, updates: Partial<CardType>) => {
    takeSnapshot();
    const card = cards.find(c => c.id === cardId);
    if (card) {
      saveCardToFirebase({ ...card, ...updates });
    }
  }, [cards, takeSnapshot]);

  const deleteCard = useCallback((cardId: Id) => {
    takeSnapshot();
    deleteCardFromFirebase(cardId);
    setActiveCardId(null);
  }, [takeSnapshot]);

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleDropOnList = useCallback((e: React.DragEvent, targetListId: Id) => {
    e.preventDefault(); e.stopPropagation();
    let item = draggedItem;
    if (!item) { try { const data = e.dataTransfer.getData('application/json'); if (data) item = JSON.parse(data); } catch (err) {} }
    if (!item) return;

    if (item.type === 'BOARD') {
      if (item.id !== targetListId) {
        takeSnapshot();
        setLists(prev => {
          const newLists = [...prev];
          const dIdx = newLists.findIndex(l => l.id === item?.id);
          const tIdx = newLists.findIndex(l => l.id === targetListId);
          if (dIdx > -1 && tIdx > -1) { const [removed] = newLists.splice(dIdx, 1); newLists.splice(tIdx, 0, removed); }
          return newLists;
        });
      }
    } else if (item.type === 'CARD') {
      if (item.listId !== targetListId) {
        takeSnapshot();
        const card = cards.find(c => c.id === item?.id);
        if (card) {
          saveCardToFirebase({ ...card, listId: targetListId });
        }
      }
    }
    setDraggedItem(null);
  }, [draggedItem, setLists, setCards, takeSnapshot]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDragEnd = () => { setDraggedItem(null); setIsOverTrash(false); };

  const activeCard = useMemo(() => cards.find(c => c.id === activeCardId), [cards, activeCardId]);

  return (
    <div 
      className={`flex flex-col h-full relative overflow-hidden transition-colors duration-300 animate-fadeIn ${!backgroundImage ? 'bg-purple-50/50 dark:bg-slate-950' : ''}`}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}}
    >
      {backgroundImage && <div className="fixed inset-0 bg-white/20 dark:bg-black/50 backdrop-blur-[2px] z-0 pointer-events-none transition-colors duration-300" />}

      {/* Menu Lateral de Planejamentos (Mover para a Direita) */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out border-l border-purple-100 dark:border-slate-800 flex flex-col ${isWorkspaceMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-purple-100 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-purple-600 dark:text-purple-500 flex items-center gap-2"><MenuIcon /> Planejamentos</h2>
          <button onClick={() => setIsWorkspaceMenuOpen(false)} className="p-2 text-slate-400 hover:text-purple-500 dark:text-slate-500 rounded-full transition-colors"><XIcon /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {workspaces.map(ws => (
            <div 
              key={ws.id} 
              onClick={() => { if (editingId !== ws.id) { setActiveWorkspaceId(ws.id); setIsWorkspaceMenuOpen(false); } }}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${activeWorkspaceId === ws.id ? 'bg-purple-100/50 border-purple-300 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-200'}`}
            >
              <div className="flex-1 truncate mr-2">
                {editingId === ws.id ? (
                  <input
                    autoFocus
                    className="w-full bg-white dark:bg-slate-700 border border-purple-300 rounded px-1 text-slate-800 dark:text-white outline-none"
                    value={ws.name}
                    onChange={(e) => setWorkspaces(workspaces.map(w => w.id === ws.id ? { ...w, name: e.target.value } : w))}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={`font-bold ${activeWorkspaceId === ws.id ? 'text-purple-700 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'}`}>{ws.name}</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setEditingId(ws.id); }} className="p-1.5 text-slate-400 hover:text-blue-500"><PencilIcon className="w-4 h-4" /></button>
                {workspaces.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id); }} className="p-1.5 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>}
                <ChevronRightIcon className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-purple-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button onClick={createNewWorkspace} className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md transition-colors"><PlusIcon className="w-5 h-5" /> Criar Novo Mês</button>
        </div>
      </div>

      <header className="shrink-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-purple-100 dark:border-zinc-800 shadow-sm px-4 sm:px-6 py-3 flex items-center justify-between z-40">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-full transition-colors text-purple-500"
            title="Voltar ao Dashboard"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-500">
            <HeartIcon solid className="w-7 h-7 shrink-0" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none">Rosa CRM</h1>
              <span 
                onClick={() => setIsWorkspaceMenuOpen(true)}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 cursor-pointer hover:underline truncate max-w-[150px] sm:max-w-[200px]"
              >
                {workspaces.find(w => w.id === activeWorkspaceId)?.name}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex justify-center px-4">
          <div className="relative w-full max-w-md">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <input type="text" placeholder="Buscar clientes, contratos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-11 pr-4 py-2.5 w-full rounded-full border border-purple-200 dark:border-slate-700 bg-purple-50/80 dark:bg-slate-800/80 focus:bg-white outline-none transition-all dark:text-slate-200" />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-full p-1 border border-slate-200 dark:border-slate-700">
             <button onClick={undo} disabled={past.length === 0} className={`p-1.5 rounded-full transition-colors ${past.length > 0 ? 'text-slate-600 dark:text-slate-300 hover:text-purple-500 hover:bg-white dark:hover:bg-slate-700' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`} title="Desfazer"><UndoIcon className="w-4 h-4" /></button>
             <button onClick={redo} disabled={future.length === 0} className={`p-1.5 rounded-full transition-colors ${future.length > 0 ? 'text-slate-600 dark:text-slate-300 hover:text-purple-500 hover:bg-white dark:hover:bg-slate-700' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`} title="Refazer"><RedoIcon className="w-4 h-4" /></button>
          </div>

          <div className="relative" ref={wallpaperMenuRef}>
            <button onClick={() => setIsWallpaperMenuOpen(!isWallpaperMenuOpen)} className={`p-2 rounded-full transition-colors ${isWallpaperMenuOpen || backgroundImage ? 'text-purple-500 bg-purple-50 dark:bg-slate-800' : 'text-slate-400 hover:text-purple-500'}`} title="Plano de Fundo"><ImageIcon className="w-5 h-5" /></button>
            {isWallpaperMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-purple-100 dark:border-slate-700 p-2 z-50 flex flex-col gap-1">
                <input type="file" accept="image/*" className="hidden" ref={bgInputRef} onChange={handleBgUpload} />
                <button onClick={() => bgInputRef.current?.click()} className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-purple-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Importar Imagem</button>
                {backgroundImage && <button onClick={() => { setBackgroundImage(null); setIsWallpaperMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg text-red-600 transition-colors flex items-center gap-2 mt-1"><TrashIcon className="w-4 h-4" /> Remover Fundo</button>}
              </div>
            )}
          </div>

          <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-purple-500 rounded-full hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</button>

          <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-2 text-purple-400 hover:bg-purple-100 dark:hover:bg-slate-800 rounded-full">
               <BellIcon /> {notifications.length > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">{notifications.length}</span>}
            </button>
            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-purple-100 dark:border-slate-700 p-3 z-50 flex flex-col gap-2 max-h-96 overflow-y-auto">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 px-2">Notificações</h3>
                {notifications.length === 0 ? <p className="text-sm text-slate-500 p-4 text-center">Nenhum prazo próximo!</p> : notifications.map(notif => (
                  <div key={notif.id} onClick={() => { setActiveCardId(notif.cardId); setIsNotifOpen(false); }} className={`p-3 rounded-xl cursor-pointer transition-colors border-l-4 ${notif.type === 'overdue' ? 'bg-red-50 dark:bg-red-950/40 border-red-500 hover:bg-red-100' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 hover:bg-amber-100'}`}>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{notif.title}</h4>
                    <p className={`text-xs mt-1 ${notif.type === 'overdue' ? 'text-red-700' : 'text-amber-700'}`}>{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:flex gap-2">
            <button onClick={() => setActiveSidebar(prev => prev === 'dashboard' ? 'none' : 'dashboard')} className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-colors text-sm ${activeSidebar === 'dashboard' ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}><ChartPieIcon className="w-5 h-5" /><span className="hidden lg:inline">Visão Geral</span></button>
            <button onClick={() => setActiveSidebar(prev => prev === 'queue' ? 'none' : 'queue')} className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-colors text-sm ${activeSidebar === 'queue' ? 'bg-purple-500 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}><ClipboardListIcon className="w-5 h-5" /><span className="hidden lg:inline">Fila</span></button>
            <button onClick={() => setActiveSidebar(prev => prev === 'notes' ? 'none' : 'notes')} className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-colors text-sm ${activeSidebar === 'notes' ? 'bg-purple-500 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}><DocumentTextIcon className="w-5 h-5" /><span className="hidden lg:inline">Notas</span></button>
          </div>

          <button onClick={() => setIsWorkspaceMenuOpen(true)} className="p-2 text-purple-500 hover:text-purple-600 bg-purple-50 dark:bg-slate-800 rounded-lg transition-colors"><MenuIcon className="w-6 h-6" /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10">
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {lists.map(list => (
              <KanbanColumn
                key={list.id}
                list={list}
                cards={filteredCards.filter(c => c.listId === list.id)}
                draggedItem={draggedItem}
                onAddCard={addCard}
                onCardClick={setActiveCardId}
                onDragStart={handleDragStart}
                onDropOnList={handleDropOnList}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                updateCard={updateCard}
                deleteCard={deleteCard}
                updateList={updateList}
                deleteList={deleteList}
              />
            ))}
            <div className="flex items-center justify-center min-h-[120px] bg-slate-100/50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
              <button onClick={addList} className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 font-bold py-4 px-6 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <PlusIcon />
                <span>Novo Quadro</span>
              </button>
            </div>
          </div>
        </main>

        <aside className={`fixed top-[73px] right-0 bottom-0 bg-white/95 dark:bg-slate-900/95 border-l border-purple-100 dark:border-slate-800 transition-all duration-300 flex flex-col z-40 ${activeSidebar !== 'none' ? 'w-80 lg:w-[400px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          {activeSidebar === 'dashboard' && (
            <>
              <div className="p-4 border-b flex items-center justify-between bg-teal-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-teal-800 dark:text-teal-400 flex items-center gap-2"><ChartPieIcon className="w-5 h-5" /> Visão Geral</h2>
                <button onClick={() => setActiveSidebar('none')} className="p-1.5 text-slate-400"><XIcon /></button>
              </div>
              <div className="flex-1 p-6 flex flex-col items-center overflow-y-auto">
                 <div className="relative w-64 h-64 mt-8 mb-8 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" className="stroke-slate-200 dark:stroke-slate-800" />
                      <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-teal-400 transition-all duration-1000" strokeDasharray="251.2" strokeDashoffset={dashboardStats.strokeDashoffset} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-5xl font-extrabold text-teal-500">{dashboardStats.percent}%</span>
                       <span className="text-sm font-medium text-slate-500">Documentação</span>
                    </div>
                 </div>
                 <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center text-sm"><span className="text-slate-600 dark:text-slate-400">Total de Clientes:</span><span className="font-bold text-slate-800 dark:text-slate-200">{cards.length}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-slate-600 dark:text-slate-400">Finalizados:</span><span className="font-bold text-emerald-600">{cards.filter(c => c.isDone).length}</span></div>
                 </div>
              </div>
            </>
          )}
          {activeSidebar === 'notes' && (
            <>
              <div className="p-4 border-b flex items-center justify-between bg-purple-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5 text-purple-500" /> Bloco de Notas</h2>
                <button onClick={() => setActiveSidebar('none')} className="p-1.5 text-slate-400"><XIcon /></button>
              </div>
              <div className="flex-1 p-4 flex flex-col"><textarea value={globalNotes} onChange={(e) => setGlobalNotes(e.target.value)} placeholder="Digite suas anotações aqui..." className="flex-1 w-full bg-purple-50/30 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-xl p-4 outline-none resize-none dark:text-slate-300" /></div>
            </>
          )}
          {activeSidebar === 'queue' && (
            <>
              <div className="p-4 border-b flex items-center justify-between bg-purple-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><ClipboardListIcon className="w-5 h-5 text-purple-500" /> Fila de Contratos</h2>
                <button onClick={() => setActiveSidebar('none')} className="p-1.5 text-slate-400"><XIcon /></button>
              </div>
              <div className="flex-1 p-4 flex flex-col overflow-y-auto">
                <form onSubmit={addQueueItem} className="mb-6 flex gap-2"><input type="text" value={newQueueText} onChange={(e) => setNewQueueText(e.target.value)} placeholder="Identificação..." className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-400" /><button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors"><PlusIcon /></button></form>
                <div className="flex flex-col gap-3">
                  {contractQueue.map((item, idx) => {
                    const isExp = expandedQueueItemId === item.id;
                    return (
                      <div key={item.id} className={`flex flex-col rounded-xl border transition-all ${item.isDone ? 'bg-slate-100 dark:bg-slate-800 opacity-60' : 'bg-white dark:bg-slate-900 border-purple-200'}`}>
                        <div className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedQueueItemId(isExp ? null : item.id)}>
                          <button onClick={(e) => { e.stopPropagation(); toggleQueueItem(item.id); }} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{item.isDone && <CheckSquareIcon className="w-3.5 h-3.5"/>}</button>
                          <div className="flex-1 truncate"><span className={`block text-sm font-bold ${item.isDone ? 'line-through text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>{item.text}</span></div>
                          <div className="flex flex-col shrink-0"><button onClick={(e) => { e.stopPropagation(); moveQueueItem(idx, 'up'); }} disabled={idx === 0} className="text-slate-400 hover:text-purple-500 disabled:opacity-20"><ChevronUpIcon className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); moveQueueItem(idx, 'down'); }} disabled={idx === contractQueue.length - 1} className="text-slate-400 hover:text-purple-500 disabled:opacity-20"><ChevronDownIcon className="w-4 h-4"/></button></div>
                          <button onClick={(e) => { e.stopPropagation(); deleteQueueItem(item.id); }} className="text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                        {isExp && (
                          <div className="p-3 border-t bg-purple-50/30 dark:bg-slate-800/20 flex flex-col gap-2.5">
                            <input type="text" placeholder="Nome Completo" value={item.fullName || ''} onChange={(e) => updateQueueItem(item.id, { fullName: e.target.value })} className="w-full text-sm p-2 rounded border dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700 focus:border-purple-300 outline-none transition-all" />
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" placeholder="CPF" value={item.cpf || ''} onChange={(e) => updateQueueItem(item.id, { cpf: e.target.value })} className="w-full text-sm p-2 rounded border dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700 focus:border-purple-300 outline-none transition-all" />
                              <input type="text" placeholder="Telefone" value={item.phone || ''} onChange={(e) => updateQueueItem(item.id, { phone: e.target.value })} className="w-full text-sm p-2 rounded border dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700 focus:border-purple-300 outline-none transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" placeholder="Profissão" value={item.profession || ''} onChange={(e) => updateQueueItem(item.id, { profession: e.target.value })} className="w-full text-sm p-2 rounded border dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700 focus:border-purple-300 outline-none transition-all" />
                              <input type="text" placeholder="Relação do Avalista" value={item.relationship || ''} onChange={(e) => updateQueueItem(item.id, { relationship: e.target.value })} className="w-full text-sm p-2 rounded border dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700 focus:border-purple-300 outline-none transition-all" />
                            </div>
                            <input type="email" placeholder="E-mail" value={item.email || ''} onChange={(e) => updateQueueItem(item.id, { email: e.target.value })} className="w-full text-sm p-2 rounded border dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700 focus:border-purple-300 outline-none transition-all" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); if (draggedItem) setIsOverTrash(true); }}
        onDragLeave={() => setIsOverTrash(false)}
        onDrop={(e) => {
          e.preventDefault(); setIsOverTrash(false);
          if (!draggedItem) return;
          takeSnapshot();
          if (draggedItem.type === 'BOARD') setLists(prev => prev.filter(l => l.id !== draggedItem.id));
          else setCards(prev => prev.filter(c => c.id !== draggedItem.id));
          setDraggedItem(null);
        }}
        className={`fixed z-[100] bottom-4 right-4 flex flex-col items-center justify-center transition-all duration-300 ${draggedItem ? 'w-64 h-64 opacity-100' : 'w-0 h-0 opacity-0 pointer-events-none'} ${isOverTrash ? 'bg-red-600 scale-110' : 'bg-red-400'} rounded-3xl text-white shadow-2xl`}
      >
        <span className="text-4xl mb-2">{isOverTrash ? '🔥' : '🗑️'}</span>
        <p className="font-bold text-center px-4 tracking-wider text-sm">{isOverTrash ? 'SOLTAR PARA EXCLUIR!' : 'ARRASTE AQUI PARA EXCLUIR'}</p>
      </div>

      {activeCard && (
        <CardDetailsModal
          card={activeCard}
          listTitle={lists.find(l => l.id === activeCard.listId)?.title || ''}
          availableLabels={labels}
          onAddLabel={addLabel}
          onUpdateLabel={updateLabel}
          onDeleteLabel={deleteLabel}
          onClose={() => setActiveCardId(null)}
          onUpdate={(updates) => updateCard(activeCard.id, updates)}
          onDelete={() => deleteCard(activeCard.id)}
        />
      )}
    </div>
  );
}
