
import React, { useState, useRef, useEffect } from 'react';
import { CardType, Checklist, Label } from '../types';
import { CHECKLIST_TEMPLATES, CARD_COLORS, generateId } from '../constants';
import { XIcon, TagIcon, CheckSquareIcon, ImageIcon, HeartIcon, CalendarIcon, ClipboardListIcon, CurrencyDollarIcon, TrashIcon, PencilIcon } from './Icons';

interface CardDetailsModalProps {
  card: CardType;
  listTitle: string;
  availableLabels: Label[];
  onAddLabel: (label: Omit<Label, 'id'>) => void;
  onUpdateLabel: (id: string, updates: Partial<Label>) => void;
  onDeleteLabel: (id: string) => void;
  onClose: () => void;
  onUpdate: (updates: Partial<CardType>) => void;
  onDelete: () => void;
}

const LABEL_COLORS = [
  'bg-rose-500', 'bg-lime-500', 'bg-orange-400', 'bg-emerald-500', 
  'bg-red-600', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 
  'bg-teal-500', 'bg-indigo-500'
];

export default function CardDetailsModal({ 
  card, 
  listTitle, 
  availableLabels, 
  onAddLabel, 
  onUpdateLabel, 
  onDeleteLabel, 
  onClose, 
  onUpdate, 
  onDelete 
}: CardDetailsModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [planValue, setPlanValue] = useState(card.planValue || '');
  
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [isManagingLabels, setIsManagingLabels] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleTitleBlur = () => {
    if (title.trim() !== card.title) {
      onUpdate({ title: title.trim() || 'Sem título' });
    }
  };

  const handleDescBlur = () => {
    if (description !== card.description) {
      onUpdate({ description });
    }
  };

  const handlePlanValueBlur = () => {
    if (planValue !== card.planValue) {
      onUpdate({ planValue });
    }
  };

  // Função para formatar moeda em tempo real
  const formatCurrency = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    
    const numberValue = parseFloat(cleanValue) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue);
  };

  const handlePlanValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setPlanValue(formatted);
  };

  const toggleLabel = (label: Label) => {
    const hasLabel = card.labels.some(l => l.id === label.id);
    let newLabels;
    if (hasLabel) {
      newLabels = card.labels.filter(l => l.id !== label.id);
    } else {
      newLabels = [...card.labels, label];
    }
    onUpdate({ labels: newLabels });
  };

  const setCardColor = (colorClass: string) => {
    onUpdate({ cardColor: colorClass });
  };

  const addChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    
    const newChecklist: Checklist = {
      id: generateId(),
      title: newChecklistTitle.trim(),
      items: []
    };
    onUpdate({ checklists: [...card.checklists, newChecklist] });
    setNewChecklistTitle('');
  };

  const addTemplateChecklist = (templateId: string) => {
    const template = CHECKLIST_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newChecklist: Checklist = {
      id: generateId(),
      title: template.title,
      items: template.items.map(itemText => ({
        id: generateId(),
        text: itemText,
        isCompleted: false
      }))
    };
    onUpdate({ checklists: [...card.checklists, newChecklist] });
    setShowTemplatePicker(false);
  };

  const addChecklistItem = (checklistId: string, itemText: string) => {
    const updatedChecklists = card.checklists.map(cl => {
      if (cl.id === checklistId) {
        return {
          ...cl,
          items: [...cl.items, { id: generateId(), text: itemText, isCompleted: false }]
        };
      }
      return cl;
    });
    onUpdate({ checklists: updatedChecklists });
  };

  const toggleChecklistItem = (checklistId: string, itemId: string) => {
     const updatedChecklists = card.checklists.map(cl => {
      if (cl.id === checklistId) {
        return {
          ...cl,
          items: cl.items.map(item => item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item)
        };
      }
      return cl;
    });
    onUpdate({ checklists: updatedChecklists });
  };

  const updateChecklistTitle = (checklistId: string, newTitle: string) => {
     const updatedChecklists = card.checklists.map(cl => 
       cl.id === checklistId ? { ...cl, title: newTitle } : cl
     );
     onUpdate({ checklists: updatedChecklists });
  };

  const updateChecklistItemText = (checklistId: string, itemId: string, newText: string) => {
     const updatedChecklists = card.checklists.map(cl => {
       if (cl.id === checklistId) {
         return {
           ...cl,
           items: cl.items.map(item => item.id === itemId ? { ...item, text: newText } : item)
         };
       }
       return cl;
     });
     onUpdate({ checklists: updatedChecklists });
  };

  const deleteChecklist = (checklistId: string) => {
    onUpdate({ checklists: card.checklists.filter(cl => cl.id !== checklistId) });
  };

  const deleteChecklistItem = (checklistId: string, itemId: string) => {
     const updatedChecklists = card.checklists.map(cl => {
       if (cl.id === checklistId) {
         return {
           ...cl,
           items: cl.items.filter(item => item.id !== itemId)
         };
       }
       return cl;
     });
     onUpdate({ checklists: updatedChecklists });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files) as File[];
    const newImagesPromises = filesArray.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newImagesPromises).then(base64Images => {
      onUpdate({ images: [...card.images, ...base64Images] });
    }).catch(err => console.error("Error reading files", err));
  };

  const removeImage = (indexToRemove: number) => {
    onUpdate({ images: card.images.filter((_, idx) => idx !== indexToRemove) });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onUpdate({ dueDate: val ? val : undefined });
  };

  const headerBgColor = card.cardColor && !card.cardColor.includes('bg-white') 
    ? card.cardColor 
    : 'bg-rose-50/50 dark:bg-slate-800/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden border border-transparent dark:border-slate-700"
      >
        <div className={`flex items-start justify-between p-6 border-b border-rose-100 dark:border-slate-700 shrink-0 rounded-t-2xl transition-colors ${headerBgColor}`}>
          <div className="flex-1 pr-4">
            <input
              autoFocus
              onFocus={(e) => e.target.select()}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full text-2xl font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-500 rounded px-2 py-1 -ml-2 transition-colors"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 pl-1">
              No quadro <span className="font-semibold underline decoration-rose-400 dark:decoration-rose-500">{listTitle}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-white/50 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
          
          <div className="flex-1 space-y-8">
            
            {card.labels.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Etiquetas Ativas</h4>
                <div className="flex flex-wrap gap-2">
                  {card.labels.map(label => (
                    <span key={label.id} className={`${label.color} text-white text-sm font-bold px-3 py-1 rounded-md shadow-sm`}>
                      {label.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
               <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                 <CurrencyDollarIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Valor do Plano / Contrato
               </h4>
               <input
                 type="text"
                 inputMode="numeric"
                 value={planValue}
                 onChange={handlePlanValueChange}
                 onBlur={handlePlanValueBlur}
                 placeholder="R$ 0,00"
                 className="w-full max-w-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-400 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none transition-all font-medium text-emerald-800 dark:text-emerald-400"
               />
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                Descrição e Anotações
              </h4>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Adicione detalhes sobre a cliente, preferências, contatos, score, negociações..."
                className="w-full p-4 bg-rose-50/50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-slate-800 border border-transparent dark:border-transparent focus:border-rose-300 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl min-h-[140px] outline-none transition-all resize-y text-slate-700 dark:text-slate-300"
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckSquareIcon className="w-5 h-5 text-rose-500 dark:text-rose-400" /> Checklists
                </h4>
              </div>

              {card.checklists.length === 0 && (
                <div className="bg-rose-50 dark:bg-slate-800 border border-dashed border-rose-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
                   <p className="text-slate-600 dark:text-slate-400 font-bold mb-2">Este cliente ainda não tem checklist. Selecione um tipo:</p>
                   <div className="flex flex-wrap justify-center gap-4">
                      {CHECKLIST_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          onClick={() => addTemplateChecklist(template.id)}
                          className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl transition-all hover:scale-105 shadow-md ${
                            template.title === 'Com avalista' 
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' 
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          <span className="text-2xl">{template.title === 'Com avalista' ? '💔' : '🍏'}</span>
                          <span className="font-extrabold">{template.title}</span>
                        </button>
                      ))}
                   </div>
                </div>
              )}

              {card.checklists.map(checklist => {
                const total = checklist.items.length;
                const completed = checklist.items.filter(i => i.isCompleted).length;
                const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                return (
                  <div key={checklist.id} className="bg-white dark:bg-slate-800 border border-rose-100 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4 gap-4">
                       <input 
                         value={checklist.title}
                         onChange={(e) => updateChecklistTitle(checklist.id, e.target.value)}
                         className="font-bold text-lg text-slate-800 dark:text-slate-200 bg-transparent outline-none focus:ring-2 focus:ring-rose-200 dark:focus:ring-slate-600 rounded px-1 flex-1 transition-all"
                       />
                       <button onClick={() => deleteChecklist(checklist.id)} className="shrink-0 p-2 text-rose-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Excluir Checklist">
                         <TrashIcon className="w-5 h-5" />
                       </button>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-8">{percent}%</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${percent === 100 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {checklist.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 group bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded-lg transition-colors">
                          <button
                            onClick={() => toggleChecklistItem(checklist.id, item.id)}
                            className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              item.isCompleted 
                                ? 'bg-rose-500 border-rose-500 text-white' 
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-rose-400 dark:hover:border-rose-400'
                            }`}
                          >
                            {item.isCompleted && <CheckSquareIcon className="w-3.5 h-3.5" />}
                          </button>
                          
                          <input 
                            value={item.text}
                            onChange={(e) => updateChecklistItemText(checklist.id, item.id, e.target.value)}
                            className={`flex-1 text-sm bg-transparent outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-rose-200 dark:focus:ring-slate-600 rounded px-2 py-1 transition-all ${item.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300 font-medium'}`}
                          />

                          <button 
                            onClick={() => deleteChecklistItem(checklist.id, item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-all rounded-md"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('newItem') as HTMLInputElement;
                        if (input.value.trim()) {
                          addChecklistItem(checklist.id, input.value.trim());
                          input.value = '';
                        }
                      }}
                      className="mt-4"
                    >
                      <input 
                        name="newItem"
                        type="text" 
                        placeholder="Adicionar um item..." 
                        className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-rose-300 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 rounded-lg outline-none transition-all dark:text-slate-200"
                      />
                    </form>
                  </div>
                );
              })}

              <form onSubmit={addChecklist} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="Criar checklist manual..."
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-200 dark:focus:ring-slate-600 outline-none text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all dark:text-slate-200"
                />
                <button type="submit" className="bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/60 text-rose-700 dark:text-rose-300 px-6 py-3 rounded-xl text-sm font-bold transition-colors">
                  Criar
                </button>
              </form>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-rose-500 dark:text-rose-400" /> Fotos e Documentos
                </h4>
                <div>
                   <input 
                     type="file" 
                     accept="image/*" 
                     multiple 
                     className="hidden" 
                     ref={fileInputRef}
                     onChange={handleImageUpload}
                   />
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="bg-rose-100 dark:bg-slate-800 hover:bg-rose-200 dark:hover:bg-slate-700 text-rose-700 dark:text-slate-300 border dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
                   >
                     Anexar Arquivo
                   </button>
                </div>
              </div>

              {card.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {card.images.map((imgSrc, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-50 dark:bg-slate-800 shadow-sm">
                      <img src={imgSrc} alt={`Attachment ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-slate-700 transition-all shadow-md"
                        title="Remover imagem"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                   <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Nenhum anexo adicionado.</p>
                </div>
              )}
            </div>

          </div>

          <div className="lg:w-72 shrink-0 space-y-6">
             
             <button
                onClick={() => onUpdate({ isDone: !card.isDone })}
                className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold transition-all text-base ${
                  card.isDone 
                    ? 'bg-rose-500 dark:bg-rose-600 text-white shadow-lg shadow-rose-200/50 dark:shadow-none hover:bg-rose-600 dark:hover:bg-rose-700' 
                    : 'bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-slate-700 border border-rose-200 dark:border-slate-700'
                }`}
              >
                <HeartIcon solid={card.isDone} className="w-6 h-6" />
                {card.isDone ? 'Concluído!' : 'Marcar como Feito'}
              </button>

             <div>
               <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Adicionar ao Cartão</h4>
               
               <div className="space-y-3">
                 <div className="relative">
                    <button 
                      onClick={() => setShowLabelPicker(!showLabelPicker)}
                      className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-3 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <TagIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /> Etiquetas
                    </button>
                    
                    {showLabelPicker && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-rose-100 dark:border-slate-700 rounded-xl shadow-xl z-20 p-2">
                        {!isManagingLabels ? (
                          <>
                            <div className="max-h-60 overflow-y-auto pr-1">
                              {availableLabels.map(label => {
                                const isSelected = card.labels.some(l => l.id === label.id);
                                return (
                                  <button
                                    key={label.id}
                                    onClick={() => toggleLabel(label)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg flex items-center justify-between transition-colors mb-1"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`w-4 h-4 rounded shadow-sm shrink-0 ${label.color}`}></span>
                                      <span className="text-slate-700 dark:text-slate-300 font-semibold truncate">{label.text}</span>
                                    </div>
                                    {isSelected && <HeartIcon solid className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                              <button 
                                onClick={() => setIsManagingLabels(true)} 
                                className="w-full text-center text-xs font-bold text-rose-500 hover:text-rose-600 py-1 flex items-center justify-center gap-1 transition-colors"
                              >
                                <PencilIcon className="w-3.5 h-3.5" /> Gerenciar Etiquetas
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col gap-3">
                             <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Gerenciar Etiquetas</span>
                                <button onClick={() => setIsManagingLabels(false)} className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors">Voltar</button>
                             </div>
                             
                             <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                               {availableLabels.map(label => (
                                 <div key={label.id} className="flex flex-col gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <div className="flex gap-2">
                                       <input 
                                         type="text" 
                                         value={label.text}
                                         onChange={(e) => onUpdateLabel(label.id, { text: e.target.value })}
                                         className="flex-1 text-xs font-medium px-2 py-1.5 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none focus:border-rose-400 transition-colors"
                                       />
                                       <button onClick={() => onDeleteLabel(label.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 p-1 rounded transition-colors shrink-0">
                                         <TrashIcon className="w-4 h-4" />
                                       </button>
                                    </div>
                                    <div className="flex gap-1.5 mt-1 flex-wrap">
                                       {LABEL_COLORS.map(c => (
                                         <button 
                                           key={c} 
                                           onClick={() => onUpdateLabel(label.id, { color: c })} 
                                           className={`w-5 h-5 rounded-full shadow-sm transition-transform hover:scale-110 ${c} ${label.color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-300 dark:ring-offset-slate-900' : ''}`} 
                                         />
                                       ))}
                                    </div>
                                 </div>
                               ))}
                             </div>

                             <div className="p-3 border border-dashed border-rose-200 dark:border-slate-700 rounded-xl bg-rose-50/50 dark:bg-slate-800/50 flex flex-col gap-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nova Etiqueta</span>
                                <input 
                                  type="text" 
                                  placeholder="Nome da etiqueta..."
                                  value={newLabelText}
                                  onChange={(e) => setNewLabelText(e.target.value)}
                                  className="w-full text-xs font-medium px-2 py-1.5 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none focus:border-rose-400 transition-colors"
                                />
                                <div className="flex gap-1.5 flex-wrap">
                                   {LABEL_COLORS.map(c => (
                                     <button 
                                       key={c} 
                                       onClick={() => setNewLabelColor(c)} 
                                       className={`w-5 h-5 rounded-full shadow-sm transition-transform hover:scale-110 ${c} ${newLabelColor === c ? 'ring-2 ring-offset-2 ring-rose-400 dark:ring-offset-slate-900' : ''}`} 
                                     />
                                   ))}
                                </div>
                                <button 
                                  onClick={() => { 
                                    if(newLabelText.trim()) { 
                                      onAddLabel({ text: newLabelText.trim(), color: newLabelColor }); 
                                      setNewLabelText(''); 
                                    } 
                                  }}
                                  className="w-full bg-rose-500 text-white text-xs py-2 rounded-lg mt-1 hover:bg-rose-600 font-bold transition-colors shadow-sm"
                                >
                                  Criar Etiqueta
                                </button>
                             </div>
                          </div>
                        )}
                      </div>
                    )}
                 </div>

                 <div className="relative">
                    <button 
                      onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                      className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-3 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <ClipboardListIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /> Checklist Pronto
                    </button>
                    
                    {showTemplatePicker && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-rose-100 dark:border-slate-700 rounded-xl shadow-xl z-20 p-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2 px-2">Escolha um modelo:</p>
                        {CHECKLIST_TEMPLATES.map(template => (
                          <button
                            key={template.id}
                            onClick={() => addTemplateChecklist(template.id)}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg text-rose-600 dark:text-rose-400 font-bold transition-colors"
                          >
                            + {template.title}
                          </button>
                        ))}
                      </div>
                    )}
                 </div>

                 <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex flex-col gap-2">
                   <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /> Prazo / Vencimento
                   </label>
                   <input 
                     type="date" 
                     value={card.dueDate || ''} 
                     onChange={handleDateChange}
                     className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:focus:ring-slate-500 transition-all bg-white dark:bg-slate-900"
                   />
                 </div>

                 <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex flex-col gap-3">
                   <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      Cor do Cartão
                   </label>
                   <div className="flex flex-wrap gap-2">
                      {CARD_COLORS.map(color => {
                        const isSelected = card.cardColor === color.class || (!card.cardColor && color.id === 'white') || (card.cardColor && card.cardColor.includes(color.class.split(' ')[0]));
                        
                        return (
                          <button
                            type="button"
                            key={color.id}
                            onClick={() => setCardColor(color.class)}
                            title={color.name}
                            className={`w-8 h-8 rounded-full transition-all ${color.class} ${isSelected ? 'ring-4 ring-rose-500 dark:ring-rose-400 scale-110 shadow-md border-transparent' : 'border-2 border-slate-300 dark:border-slate-500 hover:scale-110'}`}
                          />
                        )
                      })}
                   </div>
                 </div>
                 
               </div>
             </div>

             <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
               <button 
                 type="button"
                 onClick={() => {
                   if(window.confirm("Tem certeza que deseja excluir esta cliente definitivamente?")) {
                     onDelete();
                   }
                 }}
                 className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-300 px-4 py-3 rounded-xl text-sm font-bold transition-colors text-center flex justify-center items-center gap-2 border border-transparent dark:border-red-900/50"
               >
                 <TrashIcon className="w-4 h-4" /> Excluir Cliente
               </button>
             </div>

             <div className="text-xs font-medium text-slate-400 dark:text-slate-600 mt-8 text-center">
               Criado em {new Date(card.createdAt).toLocaleDateString('pt-BR')}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
