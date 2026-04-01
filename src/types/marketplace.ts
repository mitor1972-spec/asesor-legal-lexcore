// Shared types for LeadsMarket components

export interface RawScore {
  score: number;
  max: number;
  breakdown?: string;
}

export interface RawScores {
  contactability?: RawScore;
  intent?: RawScore;
  urgency?: RawScore;
  case_quality?: RawScore;
  evidence?: RawScore;
  clarity?: RawScore;
  // Legacy keys for backward compat
  personal_data?: RawScore;
  case_facts?: RawScore;
  legal_fit?: RawScore;
  [key: string]: RawScore | undefined;
}

export interface MarketplaceLead {
  id: string;
  marketplace_summary: string;
  marketplace_price: number;
  score_final: number;
  source_channel: string;
  created_at: string;
  conversation_id?: number | null;
  structured_fields: {
    legal_area?: string;
    area_legal?: string;
    province?: string;
    provincia?: string;
    city?: string;
    ciudad?: string;
    urgencia_aplica?: boolean;
    urgencia_nivel?: string;
    cuantia_aproximada?: string;
    cuantia?: string | number;
    cuantia_texto?: string;
    complejidad?: string;
    _contact_alias?: string;
    subarea?: string;
    [key: string]: any;
  };
  vj_value?: number;
  vj_key_phrases?: string[];
  raw_scores?: RawScores;
  case_summary?: string;
  /** Whether this lead's area supports commission-based acquisition */
  commission_available?: boolean;
  /** The commission % for this area if available */
  commission_percent?: number;
}

export interface CartItem {
  id: string;
  legalArea: string;
  province: string;
  score: number;
  price: number;
  /** Whether the user chose commission model for this item */
  isCommission?: boolean;
  /** Commission percentage if commission model */
  commissionPercent?: number;
}