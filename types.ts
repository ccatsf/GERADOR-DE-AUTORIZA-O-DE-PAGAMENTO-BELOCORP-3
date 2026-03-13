export type Id = string;

export interface Label {
  id: Id;
  text: string;
  color: string;
}

export interface ChecklistItem {
  id: Id;
  text: string;
  isCompleted: boolean;
}

export interface Checklist {
  id: Id;
  title: string;
  items: ChecklistItem[];
}

export interface CardType {
  id: Id;
  listId: Id;
  title: string;
  description: string;
  labels: Label[];
  checklists: Checklist[];
  images: string[];
  isDone: boolean;
  createdAt: number;
  dueDate?: string;
  planValue?: string;
  cardColor?: string;
}

export interface ListType {
  id: Id;
  title: string;
  theme?: string;
}

export interface DragItem {
  id: Id;
  type: 'CARD' | 'BOARD';
  listId?: Id;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  items: string[];
}

export interface QueueItem {
  id: string;
  text: string; // Título rápido (ex: Marido da Joana)
  isDone: boolean;
  fullName?: string;
  cpf?: string;
  profession?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
}
