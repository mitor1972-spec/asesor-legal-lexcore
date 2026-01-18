import type { AreaLegal, Provincia, SourceChannel, LeadStatus, UrgencyLevel } from "@/lib/constants";

export type AppRole = 'admin' | 'operator' | 'lawfirm_admin' | 'lawfirm_manager' | 'lawfirm_lawyer';
export type ThemePref = 'light' | 'dark' | 'system';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  lawfirm_id: string | null;
  branch_id: string | null;
  theme_pref: ThemePref;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface StructuredFields {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  provincia?: Provincia;
  area_legal?: AreaLegal;
  subarea?: string;
  cuantia?: number | null;
  cuantia_texto?: string;
  urgencia_aplica?: boolean;
  urgencia_nivel?: UrgencyLevel | null;
  urgencia_motivo?: string;
  n_despachos?: number;
  preferencia_contacto?: 'Teléfono' | 'Email' | 'WhatsApp' | null;
  franja_horaria?: string;
  documentacion?: string[];
  notas_operador?: string;
}

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  source_channel: SourceChannel;
  lead_text: string;
  structured_fields: StructuredFields;
  status_internal: LeadStatus;
  score_final: number | null;
  price_final: number | null;
  archived_at: string | null;
}

export interface LeadAttachment {
  id: string;
  lead_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_by_user_id: string | null;
  uploaded_at: string;
  attachment_context: 'initial' | 'update';
}

export interface LeadHistory {
  id: string;
  lead_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Lawfirm {
  id: string;
  name: string;
  email_derivations: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Branch {
  id: string;
  lawfirm_id: string;
  name: string;
  province: string | null;
  email_derivations: string | null;
  created_at: string;
}

export interface LeadAssignment {
  id: string;
  lead_id: string;
  lawfirm_id: string | null;
  branch_id: string | null;
  assigned_at: string;
  assigned_by_user_id: string | null;
  status_delivery: 'pending' | 'sent' | 'delivered' | 'failed';
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  role: AppRole | null;
}
