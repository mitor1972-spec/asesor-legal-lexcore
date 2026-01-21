export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      advertisements: {
        Row: {
          areas: string[] | null
          clicks: number | null
          created_at: string | null
          ends_at: string
          id: string
          impressions: number | null
          lawfirm_id: string | null
          plan: string | null
          price_monthly: number | null
          provinces: string[] | null
          starts_at: string
          status: string | null
          total_paid: number | null
          updated_at: string | null
        }
        Insert: {
          areas?: string[] | null
          clicks?: number | null
          created_at?: string | null
          ends_at: string
          id?: string
          impressions?: number | null
          lawfirm_id?: string | null
          plan?: string | null
          price_monthly?: number | null
          provinces?: string[] | null
          starts_at: string
          status?: string | null
          total_paid?: number | null
          updated_at?: string | null
        }
        Update: {
          areas?: string[] | null
          clicks?: number | null
          created_at?: string | null
          ends_at?: string
          id?: string
          impressions?: number | null
          lawfirm_id?: string | null
          plan?: string | null
          price_monthly?: number | null
          provinces?: string[] | null
          starts_at?: string
          status?: string | null
          total_paid?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          prompt_key: string
          prompt_name: string
          prompt_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          prompt_key: string
          prompt_name: string
          prompt_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          prompt_key?: string
          prompt_name?: string
          prompt_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          key_name: string
          key_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          key_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          key_value?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          lawfirm_id: string | null
          reference_id: string | null
          type: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lawfirm_id?: string | null
          reference_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lawfirm_id?: string | null
          reference_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_transactions_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string | null
          email_derivations: string | null
          id: string
          is_demo: boolean | null
          lawfirm_id: string | null
          name: string
          province: string | null
        }
        Insert: {
          created_at?: string | null
          email_derivations?: string | null
          id?: string
          is_demo?: boolean | null
          lawfirm_id?: string | null
          name: string
          province?: string | null
        }
        Update: {
          created_at?: string | null
          email_derivations?: string | null
          id?: string
          is_demo?: boolean | null
          lawfirm_id?: string | null
          name?: string
          province?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
        ]
      }
      case_activities: {
        Row: {
          activity_type: string
          call_duration_minutes: number | null
          call_result: string | null
          created_at: string | null
          email_direction: string | null
          email_subject: string | null
          id: string
          lawfirm_id: string
          lead_id: string
          notes: string | null
          reminder_date: string | null
          reminder_sent: boolean | null
          task_completed: boolean | null
          task_due_date: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          call_duration_minutes?: number | null
          call_result?: string | null
          created_at?: string | null
          email_direction?: string | null
          email_subject?: string | null
          id?: string
          lawfirm_id: string
          lead_id: string
          notes?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          task_completed?: boolean | null
          task_due_date?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          call_duration_minutes?: number | null
          call_result?: string | null
          created_at?: string | null
          email_direction?: string | null
          email_subject?: string | null
          id?: string
          lawfirm_id?: string
          lead_id?: string
          notes?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          task_completed?: boolean | null
          task_due_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_activities_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatwoot_conversations: {
        Row: {
          chatwoot_account_id: number | null
          chatwoot_contact_id: number | null
          chatwoot_conversation_id: number
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_content: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          messages_count: number | null
          processed_at: string | null
          status: string | null
        }
        Insert: {
          chatwoot_account_id?: number | null
          chatwoot_contact_id?: number | null
          chatwoot_conversation_id: number
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_content?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          messages_count?: number | null
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          chatwoot_account_id?: number | null
          chatwoot_contact_id?: number | null
          chatwoot_conversation_id?: number
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_content?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          messages_count?: number | null
          processed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatwoot_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chatwoot_import_logs: {
        Row: {
          chatwoot_conversation_id: number | null
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload_json: Json | null
          status: string
        }
        Insert: {
          chatwoot_conversation_id?: number | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload_json?: Json | null
          status: string
        }
        Update: {
          chatwoot_conversation_id?: number | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload_json?: Json | null
          status?: string
        }
        Relationships: []
      }
      chatwoot_messages: {
        Row: {
          content: string | null
          conversation_id: number
          id: string
          lead_id: string | null
          message_created_at: string | null
          message_id: number | null
          processed: boolean | null
          received_at: string | null
          sender_name: string | null
          sender_type: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: number
          id?: string
          lead_id?: string | null
          message_created_at?: string | null
          message_id?: number | null
          processed?: boolean | null
          received_at?: string | null
          sender_name?: string | null
          sender_type?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: number
          id?: string
          lead_id?: string | null
          message_created_at?: string | null
          message_id?: number | null
          processed?: boolean | null
          received_at?: string | null
          sender_name?: string | null
          sender_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatwoot_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chatwoot_settings: {
        Row: {
          auto_process_lexcore: boolean | null
          created_at: string | null
          default_source_channel: string | null
          id: string
          is_active: boolean | null
          only_resolved_conversations: boolean | null
          updated_at: string | null
          webhook_token: string
        }
        Insert: {
          auto_process_lexcore?: boolean | null
          created_at?: string | null
          default_source_channel?: string | null
          id?: string
          is_active?: boolean | null
          only_resolved_conversations?: boolean | null
          updated_at?: string | null
          webhook_token?: string
        }
        Update: {
          auto_process_lexcore?: boolean | null
          created_at?: string | null
          default_source_channel?: string | null
          id?: string
          is_active?: boolean | null
          only_resolved_conversations?: boolean | null
          updated_at?: string | null
          webhook_token?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          cif: string | null
          city: string | null
          company_name: string | null
          currency: string | null
          date_format: string | null
          email: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          primary_color: string | null
          province: string | null
          secondary_color: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          cif?: string | null
          city?: string | null
          company_name?: string | null
          currency?: string | null
          date_format?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          province?: string | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          cif?: string | null
          city?: string | null
          company_name?: string | null
          currency?: string | null
          date_format?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          province?: string | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          lawfirm_id: string | null
          lead_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string | null
          subject: string
          template_key: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          lawfirm_id?: string | null
          lead_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          subject: string
          template_key?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          lawfirm_id?: string | null
          lead_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          created_at: string | null
          id: string
          is_configured: boolean | null
          sender_email: string | null
          sender_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_security: string | null
          smtp_user: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_configured?: boolean | null
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_security?: string | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_configured?: boolean | null
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_security?: string | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          id: string
          is_active: boolean | null
          subject: string
          template_key: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          body_html: string
          id?: string
          is_active?: boolean | null
          subject: string
          template_key: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          body_html?: string
          id?: string
          is_active?: boolean | null
          subject?: string
          template_key?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      lawfirm_applications: {
        Row: {
          accepts_marketing: boolean | null
          accepts_privacy: boolean | null
          accepts_terms: boolean | null
          address: string
          all_spain: boolean | null
          areas_selected: string[] | null
          cif: string
          city: string
          comments: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          contact_role: string | null
          created_at: string | null
          email: string
          has_multiple_offices: boolean | null
          id: string
          lawfirm_id: string | null
          max_price_per_lead: number | null
          min_score: number | null
          monthly_capacity: number | null
          name: string
          num_lawyers: string | null
          phone: string
          postal_code: string
          province: string
          provinces_selected: string[] | null
          referral_source: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          accepts_privacy?: boolean | null
          accepts_terms?: boolean | null
          address: string
          all_spain?: boolean | null
          areas_selected?: string[] | null
          cif: string
          city: string
          comments?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string | null
          email: string
          has_multiple_offices?: boolean | null
          id?: string
          lawfirm_id?: string | null
          max_price_per_lead?: number | null
          min_score?: number | null
          monthly_capacity?: number | null
          name: string
          num_lawyers?: string | null
          phone: string
          postal_code: string
          province: string
          provinces_selected?: string[] | null
          referral_source?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          accepts_privacy?: boolean | null
          accepts_terms?: boolean | null
          address?: string
          all_spain?: boolean | null
          areas_selected?: string[] | null
          cif?: string
          city?: string
          comments?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string | null
          email?: string
          has_multiple_offices?: boolean | null
          id?: string
          lawfirm_id?: string | null
          max_price_per_lead?: number | null
          min_score?: number | null
          monthly_capacity?: number | null
          name?: string
          num_lawyers?: string | null
          phone?: string
          postal_code?: string
          province?: string
          provinces_selected?: string[] | null
          referral_source?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lawfirm_applications_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawfirm_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lawfirms: {
        Row: {
          address: string | null
          alert_email_daily_summary: boolean | null
          alert_email_new_leads: boolean | null
          alert_filter_by_areas: boolean | null
          alert_filter_by_provinces: boolean | null
          alert_frequency: string | null
          alert_min_score: number | null
          alert_push_enabled: boolean | null
          areas_accepted: string[] | null
          auto_purchase_areas: string[] | null
          auto_purchase_enabled: boolean | null
          auto_purchase_max_price: number | null
          auto_purchase_min_score: number | null
          cif: string | null
          city: string | null
          commercial_notes: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          discount_percent: number | null
          email_derivations: string | null
          exclusions: string[] | null
          id: string
          initial_credit: number | null
          is_active: boolean | null
          leadsmarket_enabled: boolean | null
          logo_url: string | null
          marketplace_alerts_enabled: boolean | null
          marketplace_balance: number | null
          max_lead_price: number | null
          min_lead_score: number | null
          monthly_capacity: number | null
          name: string
          openai_api_key: string | null
          payment_model: string | null
          phone: string | null
          postal_code: string | null
          price_per_area: Json | null
          province: string | null
          provinces_accepted: string[] | null
          settings_json: Json | null
          status: Database["public"]["Enums"]["lawfirm_status"] | null
          website: string | null
        }
        Insert: {
          address?: string | null
          alert_email_daily_summary?: boolean | null
          alert_email_new_leads?: boolean | null
          alert_filter_by_areas?: boolean | null
          alert_filter_by_provinces?: boolean | null
          alert_frequency?: string | null
          alert_min_score?: number | null
          alert_push_enabled?: boolean | null
          areas_accepted?: string[] | null
          auto_purchase_areas?: string[] | null
          auto_purchase_enabled?: boolean | null
          auto_purchase_max_price?: number | null
          auto_purchase_min_score?: number | null
          cif?: string | null
          city?: string | null
          commercial_notes?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          discount_percent?: number | null
          email_derivations?: string | null
          exclusions?: string[] | null
          id?: string
          initial_credit?: number | null
          is_active?: boolean | null
          leadsmarket_enabled?: boolean | null
          logo_url?: string | null
          marketplace_alerts_enabled?: boolean | null
          marketplace_balance?: number | null
          max_lead_price?: number | null
          min_lead_score?: number | null
          monthly_capacity?: number | null
          name: string
          openai_api_key?: string | null
          payment_model?: string | null
          phone?: string | null
          postal_code?: string | null
          price_per_area?: Json | null
          province?: string | null
          provinces_accepted?: string[] | null
          settings_json?: Json | null
          status?: Database["public"]["Enums"]["lawfirm_status"] | null
          website?: string | null
        }
        Update: {
          address?: string | null
          alert_email_daily_summary?: boolean | null
          alert_email_new_leads?: boolean | null
          alert_filter_by_areas?: boolean | null
          alert_filter_by_provinces?: boolean | null
          alert_frequency?: string | null
          alert_min_score?: number | null
          alert_push_enabled?: boolean | null
          areas_accepted?: string[] | null
          auto_purchase_areas?: string[] | null
          auto_purchase_enabled?: boolean | null
          auto_purchase_max_price?: number | null
          auto_purchase_min_score?: number | null
          cif?: string | null
          city?: string | null
          commercial_notes?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          discount_percent?: number | null
          email_derivations?: string | null
          exclusions?: string[] | null
          id?: string
          initial_credit?: number | null
          is_active?: boolean | null
          leadsmarket_enabled?: boolean | null
          logo_url?: string | null
          marketplace_alerts_enabled?: boolean | null
          marketplace_balance?: number | null
          max_lead_price?: number | null
          min_lead_score?: number | null
          monthly_capacity?: number | null
          name?: string
          openai_api_key?: string | null
          payment_model?: string | null
          phone?: string | null
          postal_code?: string | null
          price_per_area?: Json | null
          province?: string | null
          provinces_accepted?: string[] | null
          settings_json?: Json | null
          status?: Database["public"]["Enums"]["lawfirm_status"] | null
          website?: string | null
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by_user_id: string | null
          assigned_lawyer_id: string | null
          branch_id: string | null
          contacted_at: string | null
          firm_notes: string | null
          firm_status: string | null
          id: string
          last_contact_at: string | null
          lawfirm_id: string | null
          lead_id: string | null
          lost_reason: string | null
          next_action_date: string | null
          next_action_description: string | null
          result_amount: number | null
          result_notes: string | null
          service_type: string | null
          status_delivery: Database["public"]["Enums"]["delivery_status"] | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          assigned_lawyer_id?: string | null
          branch_id?: string | null
          contacted_at?: string | null
          firm_notes?: string | null
          firm_status?: string | null
          id?: string
          last_contact_at?: string | null
          lawfirm_id?: string | null
          lead_id?: string | null
          lost_reason?: string | null
          next_action_date?: string | null
          next_action_description?: string | null
          result_amount?: number | null
          result_notes?: string | null
          service_type?: string | null
          status_delivery?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          assigned_lawyer_id?: string | null
          branch_id?: string | null
          contacted_at?: string | null
          firm_notes?: string | null
          firm_status?: string | null
          id?: string
          last_contact_at?: string | null
          lawfirm_id?: string | null
          lead_id?: string | null
          lost_reason?: string | null
          next_action_date?: string | null
          next_action_description?: string | null
          result_amount?: number | null
          result_notes?: string | null
          service_type?: string | null
          status_delivery?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_assigned_lawyer_id_fkey"
            columns: ["assigned_lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          attachment_context:
            | Database["public"]["Enums"]["attachment_context"]
            | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          lead_id: string | null
          storage_path: string
          uploaded_at: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          attachment_context?:
            | Database["public"]["Enums"]["attachment_context"]
            | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id?: string | null
          storage_path: string
          uploaded_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          attachment_context?:
            | Database["public"]["Enums"]["attachment_context"]
            | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id?: string | null
          storage_path?: string
          uploaded_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_attachments_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_history: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          lead_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_legal_help: {
        Row: {
          commercial_next_steps: string | null
          documentation_needed: string | null
          estimated_complexity: string | null
          generated_at: string | null
          id: string
          lawfirm_id: string | null
          lead_id: string | null
          legal_next_steps: string | null
          legal_orientation: string | null
          llm_response_json: Json | null
          risks_alerts: string | null
        }
        Insert: {
          commercial_next_steps?: string | null
          documentation_needed?: string | null
          estimated_complexity?: string | null
          generated_at?: string | null
          id?: string
          lawfirm_id?: string | null
          lead_id?: string | null
          legal_next_steps?: string | null
          legal_orientation?: string | null
          llm_response_json?: Json | null
          risks_alerts?: string | null
        }
        Update: {
          commercial_next_steps?: string | null
          documentation_needed?: string | null
          estimated_complexity?: string | null
          generated_at?: string | null
          id?: string
          lawfirm_id?: string | null
          lead_id?: string | null
          legal_next_steps?: string | null
          legal_orientation?: string | null
          llm_response_json?: Json | null
          risks_alerts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_legal_help_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_legal_help_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_purchases: {
        Row: {
          id: string
          lawfirm_id: string | null
          lead_id: string | null
          new_balance: number | null
          previous_balance: number | null
          price_paid: number
          purchased_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          lawfirm_id?: string | null
          lead_id?: string | null
          new_balance?: number | null
          previous_balance?: number | null
          price_paid: number
          purchased_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          lawfirm_id?: string | null
          lead_id?: string | null
          new_balance?: number | null
          previous_balance?: number | null
          price_paid?: number
          purchased_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archived_at: string | null
          case_summary: string | null
          conversation_id: number | null
          created_at: string | null
          created_by_user_id: string | null
          discard_reason: string | null
          discarded_at: string | null
          id: string
          is_in_marketplace: boolean | null
          last_message_at: string | null
          last_processed_at: string | null
          lead_text: string
          marketplace_added_at: string | null
          marketplace_price: number | null
          marketplace_summary: string | null
          price_final: number | null
          score_final: number | null
          source_channel: Database["public"]["Enums"]["source_channel"] | null
          status_internal: Database["public"]["Enums"]["lead_status"] | null
          structured_fields: Json | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          case_summary?: string | null
          conversation_id?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          discard_reason?: string | null
          discarded_at?: string | null
          id?: string
          is_in_marketplace?: boolean | null
          last_message_at?: string | null
          last_processed_at?: string | null
          lead_text: string
          marketplace_added_at?: string | null
          marketplace_price?: number | null
          marketplace_summary?: string | null
          price_final?: number | null
          score_final?: number | null
          source_channel?: Database["public"]["Enums"]["source_channel"] | null
          status_internal?: Database["public"]["Enums"]["lead_status"] | null
          structured_fields?: Json | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          case_summary?: string | null
          conversation_id?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          discard_reason?: string | null
          discarded_at?: string | null
          id?: string
          is_in_marketplace?: boolean | null
          last_message_at?: string | null
          last_processed_at?: string | null
          lead_text?: string
          marketplace_added_at?: string | null
          marketplace_price?: number | null
          marketplace_summary?: string | null
          price_final?: number | null
          score_final?: number | null
          source_channel?: Database["public"]["Enums"]["source_channel"] | null
          status_internal?: Database["public"]["Enums"]["lead_status"] | null
          structured_fields?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_services: {
        Row: {
          avg_rating: number | null
          base_price: number
          created_at: string | null
          estimated_duration: string | null
          full_description: string | null
          geographic_scope: string | null
          id: string
          lawfirm_id: string
          legal_area: string
          name: string
          price_options: Json | null
          provinces: string[] | null
          required_documents: string[] | null
          review_count: number | null
          short_description: string | null
          slug: string | null
          status: string | null
          total_orders: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          avg_rating?: number | null
          base_price: number
          created_at?: string | null
          estimated_duration?: string | null
          full_description?: string | null
          geographic_scope?: string | null
          id?: string
          lawfirm_id: string
          legal_area: string
          name: string
          price_options?: Json | null
          provinces?: string[] | null
          required_documents?: string[] | null
          review_count?: number | null
          short_description?: string | null
          slug?: string | null
          status?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_rating?: number | null
          base_price?: number
          created_at?: string | null
          estimated_duration?: string | null
          full_description?: string | null
          geographic_scope?: string | null
          id?: string
          lawfirm_id?: string
          legal_area?: string
          name?: string
          price_options?: Json | null
          provinces?: string[] | null
          required_documents?: string[] | null
          review_count?: number | null
          short_description?: string | null
          slug?: string | null
          status?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_services_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
        ]
      }
      lexcore_configs: {
        Row: {
          config_json: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          version_name: string
        }
        Insert: {
          config_json: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          version_name: string
        }
        Update: {
          config_json?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lexcore_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lexcore_runs: {
        Row: {
          adjustments_json: Json | null
          audit_table_json: Json | null
          computed_at: string | null
          conclusion_text: string | null
          config_id: string | null
          executed_by: string | null
          flags_json: Json | null
          id: string
          lead_id: string | null
          llm_response_json: Json | null
          mode_used: string | null
          penalties_json: Json | null
          potential_internal: number | null
          price_after_caps: number | null
          price_lexcore: number
          raw_scores_json: Json | null
          score_final: number
          vj_json: Json | null
          weighted_scores_json: Json | null
        }
        Insert: {
          adjustments_json?: Json | null
          audit_table_json?: Json | null
          computed_at?: string | null
          conclusion_text?: string | null
          config_id?: string | null
          executed_by?: string | null
          flags_json?: Json | null
          id?: string
          lead_id?: string | null
          llm_response_json?: Json | null
          mode_used?: string | null
          penalties_json?: Json | null
          potential_internal?: number | null
          price_after_caps?: number | null
          price_lexcore: number
          raw_scores_json?: Json | null
          score_final: number
          vj_json?: Json | null
          weighted_scores_json?: Json | null
        }
        Update: {
          adjustments_json?: Json | null
          audit_table_json?: Json | null
          computed_at?: string | null
          conclusion_text?: string | null
          config_id?: string | null
          executed_by?: string | null
          flags_json?: Json | null
          id?: string
          lead_id?: string | null
          llm_response_json?: Json | null
          mode_used?: string | null
          penalties_json?: Json | null
          potential_internal?: number | null
          price_after_caps?: number | null
          price_lexcore?: number
          raw_scores_json?: Json | null
          score_final?: number
          vj_json?: Json | null
          weighted_scores_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lexcore_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "lexcore_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lexcore_runs_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lexcore_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_settings: {
        Row: {
          auto_publish_enabled: boolean | null
          evening_publish_time: string | null
          id: string
          morning_publish_time: string | null
          price_markup_percent: number | null
          send_evening_email: boolean | null
          send_morning_email: boolean | null
          updated_at: string | null
        }
        Insert: {
          auto_publish_enabled?: boolean | null
          evening_publish_time?: string | null
          id?: string
          morning_publish_time?: string | null
          price_markup_percent?: number | null
          send_evening_email?: boolean | null
          send_morning_email?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auto_publish_enabled?: boolean | null
          evening_publish_time?: string | null
          id?: string
          morning_publish_time?: string | null
          price_markup_percent?: number | null
          send_evening_email?: boolean | null
          send_morning_email?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          lawfirm_id: string | null
          theme_pref: Database["public"]["Enums"]["theme_pref"] | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          lawfirm_id?: string | null
          theme_pref?: Database["public"]["Enums"]["theme_pref"] | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          lawfirm_id?: string | null
          theme_pref?: Database["public"]["Enums"]["theme_pref"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_notes: {
        Row: {
          audio_url: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          is_internal: boolean | null
          lawfirm_id: string | null
          lead_id: string | null
          transcription: string | null
          user_id: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_internal?: boolean | null
          lawfirm_id?: string | null
          lead_id?: string | null
          transcription?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_internal?: boolean | null
          lawfirm_id?: string | null
          lead_id?: string | null
          transcription?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_notes_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string | null
          headers: Json | null
          id: string
          method: string | null
          path: string | null
          payload: Json | null
          processing_time_ms: number | null
          query_params: Json | null
          result: string
          source: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          headers?: Json | null
          id?: string
          method?: string | null
          path?: string | null
          payload?: Json | null
          processing_time_ms?: number | null
          query_params?: Json | null
          result?: string
          source?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          headers?: Json | null
          id?: string
          method?: string | null
          path?: string | null
          payload?: Json | null
          processing_time_ms?: number | null
          query_params?: Json | null
          result?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_lawfirm_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_internal_user: { Args: { _user_id: string }; Returns: boolean }
      is_lawfirm_admin_of: {
        Args: { _lawfirm_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "operator"
        | "lawfirm_admin"
        | "lawfirm_manager"
        | "lawfirm_lawyer"
      attachment_context: "initial" | "update"
      delivery_status: "pending" | "sent" | "delivered" | "failed"
      firm_case_status:
        | "received"
        | "reviewing"
        | "contacted"
        | "in_progress"
        | "won"
        | "lost"
        | "rejected"
        | "archived"
      lawfirm_status: "active" | "inactive"
      lead_status: "Pendiente" | "Enviado" | "Aceptado"
      source_channel: "Teléfono" | "Web chat" | "WhatsApp" | "Email"
      theme_pref: "light" | "dark" | "system"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "operator",
        "lawfirm_admin",
        "lawfirm_manager",
        "lawfirm_lawyer",
      ],
      attachment_context: ["initial", "update"],
      delivery_status: ["pending", "sent", "delivered", "failed"],
      firm_case_status: [
        "received",
        "reviewing",
        "contacted",
        "in_progress",
        "won",
        "lost",
        "rejected",
        "archived",
      ],
      lawfirm_status: ["active", "inactive"],
      lead_status: ["Pendiente", "Enviado", "Aceptado"],
      source_channel: ["Teléfono", "Web chat", "WhatsApp", "Email"],
      theme_pref: ["light", "dark", "system"],
    },
  },
} as const
