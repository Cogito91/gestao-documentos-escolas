export type UserRole = 'admin' | 'pedagoga' | 'professor';
export type DocumentStatus = 'pendente' | 'em_analise' | 'aprovado' | 'devolvido';
export type NotificationType = 'document_status' | 'new_message' | 'deadline_warning' | 'system';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  discipline?: string | null;
  shift?: string | null;
  birth_day?: number | null;
  birth_month?: number | null;
  schedule_file_url?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string | null;
  deadline_day?: number | null;
  deadline_month?: number | null;
  deadline_date?: string | null;
  bimestre?: string | null;
  requires_evidence?: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CustomFolder {
  id: string;
  teacher_id: string;
  name: string;
  color: string;
  created_at: string;
}

export type SpecialDocumentKind = 'regular' | 'emergencial' | 'atestado' | 'ocorrencia';

export interface SchoolDocument {
  id: string;
  teacher_id: string;
  category_id?: string | null;
  folder_id?: string | null;
  title: string;
  description?: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type?: string | null;
  status: DocumentStatus;
  feedback?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  submitted_at: string;
  updated_at: string;
  evidence_files?: Array<{ name: string; url: string }>;
  special_kind?: SpecialDocumentKind;
  absence_dates?: string[];
  target_classes?: string;
  certificate_type?: string;
  student_name?: string;
  action_taken?: string;
  occurrence_date?: string;
  occurrence_time_slot?: string;
  
  teacher?: Profile;
  category?: DocumentCategory;
  folder?: CustomFolder;
  reviewer?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  document_id?: string | null;
  content: string;
  read: boolean;
  created_at: string;
  
  sender?: Profile;
  recipient?: Profile;
  document?: SchoolDocument;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link_url?: string | null;
  created_at: string;
}

export interface TeacherSchedule {
  id: string;
  teacher_id: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  class_name: string;
  subject?: string | null;
  created_at?: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  event_type: 'pedagogico' | 'reuniao' | 'conselho' | 'feriado' | 'prova' | 'evento';
  created_by?: string | null;
  created_at?: string;
}

export interface Birthday {
  id: string;
  name: string;
  birth_day: number;
  birth_month: number;
  role_or_class?: string | null;
  created_at?: string;
}
