
import { Label, ListType, CardType, ChecklistTemplate } from './types';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const DEFAULT_LABELS: Label[] = [
  { id: 'l1', text: 'Com avalista 💔', color: 'bg-rose-500' },
  { id: 'l2', text: 'Sem avalista 🍏', color: 'bg-lime-500' },
  { id: 'l3', text: 'Pendente', color: 'bg-orange-400' },
  { id: 'l4', text: 'Aprovado', color: 'bg-emerald-500' },
  { id: 'l5', text: 'Urgente', color: 'bg-red-600' },
];

export const CARD_COLORS = [
  { id: 'white', class: 'bg-white dark:bg-slate-800', name: 'Branco' },
  { id: 'rose', class: 'bg-rose-100 dark:bg-rose-900/40', name: 'Rosa' },
  { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/40', name: 'Azul' },
  { id: 'green', class: 'bg-emerald-50 dark:bg-emerald-900/40', name: 'Verde' },
  { id: 'yellow', class: 'bg-amber-50 dark:bg-amber-900/40', name: 'Amarelo' },
  { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/40', name: 'Roxo' },
];

export const LIST_THEMES = [
  { id: 'rose', name: 'Rosa', colorCode: '#ffe4e6' },
  { id: 'slate', name: 'Cinza', colorCode: '#f1f5f9' },
  { id: 'blue', name: 'Azul', colorCode: '#eff6ff' },
  { id: 'emerald', name: 'Verde', colorCode: '#ecfdf5' },
  { id: 'amber', name: 'Amarelo', colorCode: '#fffbeb' },
  { id: 'purple', name: 'Roxo', colorCode: '#faf5ff' },
];

export const INITIAL_LISTS: ListType[] = [
  { id: 'list-2', title: 'Com avalista 💔', theme: 'purple' },
  { id: 'list-3', title: 'Sem avalista 🍏', theme: 'emerald' },
  { id: 'list-4', title: 'Contratos avalista a fazer:', theme: 'slate' },
  { id: 'list-5', title: 'AUTORIZAÇÃO WESLEY', theme: 'amber' },
  { id: 'list-6', title: 'Script', theme: 'purple' },
];

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Com avalista',
    items: [
      'Documentos pessoais',
      'Documentos Pessoais Avalista',
      'Comprovante de renda avalista',
      'Nota promissoria',
      '50% e/ou 75% do plano',
      'Laudo'
    ]
  },
  {
    id: 'tpl-2',
    title: 'Sem avalista',
    items: [
      'Documentos pessoais',
      'Nota Promissoria',
      'Comprovante de renda',
      'Pagamento 50% do plano',
      'Laudo'
    ]
  }
];

export const INITIAL_CARDS: CardType[] = [
  {
    id: 'card-1',
    listId: 'list-2',
    title: 'JESSICA DE FATIMA SILVEIRA COELHO',
    description: '( 027.222.110-41 ) - fazer contrato aditivo do marido (analisar score, marido assina promissoria)',
    labels: [],
    checklists: [
      {
        id: 'chk-init-1',
        title: 'Com avalista',
        items: [
          { id: 'it-1', text: 'Documentos pessoais', isCompleted: false },
          { id: 'it-2', text: 'Documentos Pessoais Avalista', isCompleted: false },
          { id: 'it-3', text: 'Comprovante de renda avalista', isCompleted: false },
          { id: 'it-4', text: 'Nota promissoria', isCompleted: false },
          { id: 'it-5', text: '50% e/ou 75% do plano', isCompleted: false },
          { id: 'it-6', text: 'Laudo', isCompleted: false }
        ]
      }
    ],
    images: [],
    isDone: false,
    cardColor: 'bg-rose-100 dark:bg-rose-900/40',
    createdAt: Date.now(),
  }
];
