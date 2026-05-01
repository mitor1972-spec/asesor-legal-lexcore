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
      ad_invoices: {
        Row: {
          amount: number
          concept: string | null
          created_at: string | null
          fiscal_address: string | null
          fiscal_cif: string | null
          fiscal_city: string | null
          fiscal_name: string | null
          fiscal_postal_code: string | null
          fiscal_province: string | null
          id: string
          invoice_number: string
          lawfirm_id: string
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          pdf_url: string | null
          status: string | null
          stripe_invoice_id: string | null
          tax_amount: number
          tax_rate: number | null
          total_amount: number
        }
        Insert: {
          amount: number
          concept?: string | null
          created_at?: string | null
          fiscal_address?: string | null
          fiscal_cif?: string | null
          fiscal_city?: string | null
          fiscal_name?: string | null
          fiscal_postal_code?: string | null
          fiscal_province?: string | null
          id?: string
          invoice_number: string
          lawfirm_id: string
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          tax_amount: number
          tax_rate?: number | null
          total_amount: number
        }
        Update: {
          amount?: number
          concept?: string | null
          created_at?: string | null
          fiscal_address?: string | null
          fiscal_cif?: string | null
          fiscal_city?: string | null
          fiscal_name?: string | null
          fiscal_postal_code?: string | null
          fiscal_province?: string | null
          id?: string
          invoice_number?: string
          lawfirm_id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          tax_amount?: number
          tax_rate?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_invoices_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ad_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_orders: {
        Row: {
          areas_selected: string[] | null
          auto_renew: boolean | null
          base_amount: number
          config_json: Json | null
          created_at: string | null
          discount_percent: number | null
          duration: string
          ends_at: string | null
          final_amount: number
          geo_scope: string | null
          geo_target: string | null
          id: string
          keywords_count: number | null
          lawfirm_id: string
          multiplier_areas: number | null
          multiplier_keywords: number | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          product_id: string
          starts_at: string | null
          status: string | null
          stripe_invoice_id: string | null
          stripe_payment_id: string | null
          updated_at: string | null
        }
        Insert: {
          areas_selected?: string[] | null
          auto_renew?: boolean | null
          base_amount: number
          config_json?: Json | null
          created_at?: string | null
          discount_percent?: number | null
          duration?: string
          ends_at?: string | null
          final_amount: number
          geo_scope?: string | null
          geo_target?: string | null
          id?: string
          keywords_count?: number | null
          lawfirm_id: string
          multiplier_areas?: number | null
          multiplier_keywords?: number | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          product_id: string
          starts_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          areas_selected?: string[] | null
          auto_renew?: boolean | null
          base_amount?: number
          config_json?: Json | null
          created_at?: string | null
          discount_percent?: number | null
          duration?: string
          ends_at?: string | null
          final_amount?: number
          geo_scope?: string | null
          geo_target?: string | null
          id?: string
          keywords_count?: number | null
          lawfirm_id?: string
          multiplier_areas?: number | null
          multiplier_keywords?: number | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          product_id?: string
          starts_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_orders_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ad_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ad_products: {
        Row: {
          area_multipliers: Json | null
          badge: string | null
          base_price: number
          category_id: string | null
          created_at: string | null
          description: string | null
          discount_annual: number | null
          discount_quarterly: number | null
          discount_semester: number | null
          geo_pricing: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          keyword_multipliers: Json | null
          max_slots: number | null
          name: string
          premium_benefits: string[] | null
          price_unit: string | null
          product_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          area_multipliers?: Json | null
          badge?: string | null
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_annual?: number | null
          discount_quarterly?: number | null
          discount_semester?: number | null
          geo_pricing?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          keyword_multipliers?: Json | null
          max_slots?: number | null
          name: string
          premium_benefits?: string[] | null
          price_unit?: string | null
          product_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          area_multipliers?: Json | null
          badge?: string | null
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_annual?: number | null
          discount_quarterly?: number | null
          discount_semester?: number | null
          geo_pricing?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          keyword_multipliers?: Json | null
          max_slots?: number | null
          name?: string
          premium_benefits?: string[] | null
          price_unit?: string | null
          product_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ad_product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string | null
          id: string
          input: Json | null
          lead_id: string | null
          model: string | null
          output: string | null
          prompt_key: string
          prompt_version: number | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string | null
          id?: string
          input?: Json | null
          lead_id?: string | null
          model?: string | null
          output?: string | null
          prompt_key: string
          prompt_version?: number | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string | null
          id?: string
          input?: Json | null
          lead_id?: string | null
          model?: string | null
          output?: string | null
          prompt_key?: string
          prompt_version?: number | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          max_tokens: number
          model: string
          prompt_key: string
          prompt_name: string
          prompt_text: string
          response_format: string
          system_prompt: string | null
          temperature: number
          updated_at: string
          user_template: string | null
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number
          model?: string
          prompt_key: string
          prompt_name: string
          prompt_text: string
          response_format?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
          user_template?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number
          model?: string
          prompt_key?: string
          prompt_name?: string
          prompt_text?: string
          response_format?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
          user_template?: string | null
          version?: number
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
          address: string | null
          areas_accepted: string[] | null
          cif: string | null
          city: string | null
          created_at: string | null
          email_derivations: string | null
          id: string
          is_demo: boolean | null
          lawfirm_id: string | null
          name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          responsible_email: string | null
          responsible_name: string | null
        }
        Insert: {
          address?: string | null
          areas_accepted?: string[] | null
          cif?: string | null
          city?: string | null
          created_at?: string | null
          email_derivations?: string | null
          id?: string
          is_demo?: boolean | null
          lawfirm_id?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          responsible_email?: string | null
          responsible_name?: string | null
        }
        Update: {
          address?: string | null
          areas_accepted?: string[] | null
          cif?: string | null
          city?: string | null
          created_at?: string | null
          email_derivations?: string | null
          id?: string
          is_demo?: boolean | null
          lawfirm_id?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          responsible_email?: string | null
          responsible_name?: string | null
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
      case_ai_analyses: {
        Row: {
          analysis_type: string
          created_at: string
          created_by: string | null
          id: string
          input_snapshot: Json | null
          lawfirm_id: string
          lead_id: string
          prompt_version: string | null
          result_json: Json | null
          result_text: string | null
        }
        Insert: {
          analysis_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_snapshot?: Json | null
          lawfirm_id: string
          lead_id: string
          prompt_version?: string | null
          result_json?: Json | null
          result_text?: string | null
        }
        Update: {
          analysis_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_snapshot?: Json | null
          lawfirm_id?: string
          lead_id?: string
          prompt_version?: string | null
          result_json?: Json | null
          result_text?: string | null
        }
        Relationships: []
      }
      case_documents: {
        Row: {
          ai_extracted_data: Json | null
          ai_summary: string | null
          ai_validation_status: string | null
          category: string | null
          client_note: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          lawfirm_id: string
          lead_id: string
          status: string
          storage_path: string
          updated_at: string
          upload_link_id: string | null
          uploaded_by: string | null
          uploaded_by_type: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          ai_validation_status?: string | null
          category?: string | null
          client_note?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lawfirm_id: string
          lead_id: string
          status?: string
          storage_path: string
          updated_at?: string
          upload_link_id?: string | null
          uploaded_by?: string | null
          uploaded_by_type?: string
        }
        Update: {
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          ai_validation_status?: string | null
          category?: string | null
          client_note?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lawfirm_id?: string
          lead_id?: string
          status?: string
          storage_path?: string
          updated_at?: string
          upload_link_id?: string | null
          uploaded_by?: string | null
          uploaded_by_type?: string
        }
        Relationships: []
      }
      case_financials: {
        Row: {
          claimed_amount: number | null
          commission_percentage: number | null
          created_at: string
          engagement_letter_doc_id: string | null
          estimated_recovery: number | null
          fee_type: string | null
          fixed_fee: number | null
          id: string
          lawfirm_id: string
          lead_id: string
          notes: string | null
          paid_amount: number | null
          payment_date: string | null
          payment_status: string | null
          provision_amount: number | null
          updated_at: string
        }
        Insert: {
          claimed_amount?: number | null
          commission_percentage?: number | null
          created_at?: string
          engagement_letter_doc_id?: string | null
          estimated_recovery?: number | null
          fee_type?: string | null
          fixed_fee?: number | null
          id?: string
          lawfirm_id: string
          lead_id: string
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          provision_amount?: number | null
          updated_at?: string
        }
        Update: {
          claimed_amount?: number | null
          commission_percentage?: number | null
          created_at?: string
          engagement_letter_doc_id?: string | null
          estimated_recovery?: number | null
          fee_type?: string | null
          fixed_fee?: number | null
          id?: string
          lawfirm_id?: string
          lead_id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          provision_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      case_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          lawfirm_id: string
          lead_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lawfirm_id: string
          lead_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lawfirm_id?: string
          lead_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_timeline_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          lawfirm_id: string
          lead_id: string
          metadata: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          lawfirm_id: string
          lead_id: string
          metadata?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          lawfirm_id?: string
          lead_id?: string
          metadata?: Json | null
          title?: string
        }
        Relationships: []
      }
      case_upload_links: {
        Row: {
          client_message: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_active: boolean
          lawfirm_id: string
          lead_id: string
          max_files: number
          token: string
          used_count: number
        }
        Insert: {
          client_message?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          lawfirm_id: string
          lead_id: string
          max_files?: number
          token?: string
          used_count?: number
        }
        Update: {
          client_message?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          lawfirm_id?: string
          lead_id?: string
          max_files?: number
          token?: string
          used_count?: number
        }
        Relationships: []
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
      commercial_requests: {
        Row: {
          admin_notes: string | null
          contacted_at: string | null
          conversation_messages: Json | null
          conversation_summary: string | null
          created_at: string
          id: string
          lawfirm_id: string
          legal_areas: string[] | null
          monthly_budget: number | null
          provinces: string[] | null
          request_type: string
          specialties_suggested: string[] | null
          status: string
          strategy_mode: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          contacted_at?: string | null
          conversation_messages?: Json | null
          conversation_summary?: string | null
          created_at?: string
          id?: string
          lawfirm_id: string
          legal_areas?: string[] | null
          monthly_budget?: number | null
          provinces?: string[] | null
          request_type?: string
          specialties_suggested?: string[] | null
          status?: string
          strategy_mode?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          contacted_at?: string | null
          conversation_messages?: Json | null
          conversation_summary?: string | null
          created_at?: string
          id?: string
          lawfirm_id?: string
          legal_areas?: string[] | null
          monthly_budget?: number | null
          provinces?: string[] | null
          request_type?: string
          specialties_suggested?: string[] | null
          status?: string
          strategy_mode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commission_areas: {
        Row: {
          commission_percent: number
          created_at: string | null
          id: string
          is_active: boolean
          legal_area: string
          updated_at: string | null
        }
        Insert: {
          commission_percent?: number
          created_at?: string | null
          id?: string
          is_active?: boolean
          legal_area: string
          updated_at?: string | null
        }
        Update: {
          commission_percent?: number
          created_at?: string | null
          id?: string
          is_active?: boolean
          legal_area?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_terms_acceptance: {
        Row: {
          accepted_at: string
          accepted_by_user_id: string | null
          id: string
          ip_address: string | null
          lawfirm_id: string
          terms_version: string
        }
        Insert: {
          accepted_at?: string
          accepted_by_user_id?: string | null
          id?: string
          ip_address?: string | null
          lawfirm_id: string
          terms_version?: string
        }
        Update: {
          accepted_at?: string
          accepted_by_user_id?: string | null
          id?: string
          ip_address?: string | null
          lawfirm_id?: string
          terms_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_terms_acceptance_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
        ]
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
          commission_enabled: boolean | null
          commission_global_percent: number | null
          commission_progressive_enabled: boolean | null
          commission_progressive_tiers: Json | null
          commission_weekly_limit: number | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_role: string | null
          created_at: string | null
          credit_line_amount: number | null
          credit_line_enabled: boolean | null
          credit_line_requested_at: string | null
          credit_line_status: string | null
          description: string | null
          discount_percent: number | null
          email_derivations: string | null
          exclusions: string[] | null
          firm_type: string | null
          fiscal_address: string | null
          fiscal_city: string | null
          fiscal_email: string | null
          fiscal_model: string | null
          fiscal_name: string | null
          fiscal_postal_code: string | null
          fiscal_province: string | null
          has_valid_card: boolean | null
          id: string
          initial_credit: number | null
          interested_in_advertising: boolean | null
          interested_in_services_sales: boolean | null
          is_active: boolean | null
          is_demo: boolean | null
          leadsmarket_enabled: boolean | null
          logo_url: string | null
          marketplace_alerts_enabled: boolean | null
          marketplace_balance: number | null
          max_lead_price: number | null
          min_lead_score: number | null
          monthly_capacity: number | null
          name: string
          num_lawyers: string | null
          onboarding_completed: boolean | null
          openai_api_key: string | null
          payment_model: string | null
          phone: string | null
          postal_code: string | null
          price_per_area: Json | null
          province: string | null
          provinces_accepted: string[] | null
          referral_source: string | null
          registration_type: string | null
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
          commission_enabled?: boolean | null
          commission_global_percent?: number | null
          commission_progressive_enabled?: boolean | null
          commission_progressive_tiers?: Json | null
          commission_weekly_limit?: number | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string | null
          credit_line_amount?: number | null
          credit_line_enabled?: boolean | null
          credit_line_requested_at?: string | null
          credit_line_status?: string | null
          description?: string | null
          discount_percent?: number | null
          email_derivations?: string | null
          exclusions?: string[] | null
          firm_type?: string | null
          fiscal_address?: string | null
          fiscal_city?: string | null
          fiscal_email?: string | null
          fiscal_model?: string | null
          fiscal_name?: string | null
          fiscal_postal_code?: string | null
          fiscal_province?: string | null
          has_valid_card?: boolean | null
          id?: string
          initial_credit?: number | null
          interested_in_advertising?: boolean | null
          interested_in_services_sales?: boolean | null
          is_active?: boolean | null
          is_demo?: boolean | null
          leadsmarket_enabled?: boolean | null
          logo_url?: string | null
          marketplace_alerts_enabled?: boolean | null
          marketplace_balance?: number | null
          max_lead_price?: number | null
          min_lead_score?: number | null
          monthly_capacity?: number | null
          name: string
          num_lawyers?: string | null
          onboarding_completed?: boolean | null
          openai_api_key?: string | null
          payment_model?: string | null
          phone?: string | null
          postal_code?: string | null
          price_per_area?: Json | null
          province?: string | null
          provinces_accepted?: string[] | null
          referral_source?: string | null
          registration_type?: string | null
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
          commission_enabled?: boolean | null
          commission_global_percent?: number | null
          commission_progressive_enabled?: boolean | null
          commission_progressive_tiers?: Json | null
          commission_weekly_limit?: number | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string | null
          credit_line_amount?: number | null
          credit_line_enabled?: boolean | null
          credit_line_requested_at?: string | null
          credit_line_status?: string | null
          description?: string | null
          discount_percent?: number | null
          email_derivations?: string | null
          exclusions?: string[] | null
          firm_type?: string | null
          fiscal_address?: string | null
          fiscal_city?: string | null
          fiscal_email?: string | null
          fiscal_model?: string | null
          fiscal_name?: string | null
          fiscal_postal_code?: string | null
          fiscal_province?: string | null
          has_valid_card?: boolean | null
          id?: string
          initial_credit?: number | null
          interested_in_advertising?: boolean | null
          interested_in_services_sales?: boolean | null
          is_active?: boolean | null
          is_demo?: boolean | null
          leadsmarket_enabled?: boolean | null
          logo_url?: string | null
          marketplace_alerts_enabled?: boolean | null
          marketplace_balance?: number | null
          max_lead_price?: number | null
          min_lead_score?: number | null
          monthly_capacity?: number | null
          name?: string
          num_lawyers?: string | null
          onboarding_completed?: boolean | null
          openai_api_key?: string | null
          payment_model?: string | null
          phone?: string | null
          postal_code?: string | null
          price_per_area?: Json | null
          province?: string | null
          provinces_accepted?: string[] | null
          referral_source?: string | null
          registration_type?: string | null
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
          claimed_amount: number | null
          client_fee: number | null
          commission_origin: string | null
          commission_percent: number | null
          commission_terms_confirmed_at: string | null
          contacted_at: string | null
          fee_accepted_at: string | null
          firm_notes: string | null
          firm_status: string | null
          id: string
          is_commission: boolean | null
          is_demo: boolean | null
          last_contact_at: string | null
          lawfirm_id: string | null
          lead_cost: number | null
          lead_id: string | null
          lost_reason: string | null
          next_action_date: string | null
          next_action_description: string | null
          operational_status: string | null
          result_amount: number | null
          result_notes: string | null
          service_type: string | null
          status_delivery: Database["public"]["Enums"]["delivery_status"] | null
          success_percentage: number | null
          won_amount: number | null
          won_percentage: number | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          assigned_lawyer_id?: string | null
          branch_id?: string | null
          claimed_amount?: number | null
          client_fee?: number | null
          commission_origin?: string | null
          commission_percent?: number | null
          commission_terms_confirmed_at?: string | null
          contacted_at?: string | null
          fee_accepted_at?: string | null
          firm_notes?: string | null
          firm_status?: string | null
          id?: string
          is_commission?: boolean | null
          is_demo?: boolean | null
          last_contact_at?: string | null
          lawfirm_id?: string | null
          lead_cost?: number | null
          lead_id?: string | null
          lost_reason?: string | null
          next_action_date?: string | null
          next_action_description?: string | null
          operational_status?: string | null
          result_amount?: number | null
          result_notes?: string | null
          service_type?: string | null
          status_delivery?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          success_percentage?: number | null
          won_amount?: number | null
          won_percentage?: number | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          assigned_lawyer_id?: string | null
          branch_id?: string | null
          claimed_amount?: number | null
          client_fee?: number | null
          commission_origin?: string | null
          commission_percent?: number | null
          commission_terms_confirmed_at?: string | null
          contacted_at?: string | null
          fee_accepted_at?: string | null
          firm_notes?: string | null
          firm_status?: string | null
          id?: string
          is_commission?: boolean | null
          is_demo?: boolean | null
          last_contact_at?: string | null
          lawfirm_id?: string | null
          lead_cost?: number | null
          lead_id?: string | null
          lost_reason?: string | null
          next_action_date?: string | null
          next_action_description?: string | null
          operational_status?: string | null
          result_amount?: number | null
          result_notes?: string | null
          service_type?: string | null
          status_delivery?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          success_percentage?: number | null
          won_amount?: number | null
          won_percentage?: number | null
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
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          ai_extracted_data: Json | null
          ai_summary: string | null
          attachment_context:
            | Database["public"]["Enums"]["attachment_context"]
            | null
          category: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          lead_id: string | null
          processed_at: string | null
          storage_path: string
          uploaded_at: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          attachment_context?:
            | Database["public"]["Enums"]["attachment_context"]
            | null
          category?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id?: string | null
          processed_at?: string | null
          storage_path: string
          uploaded_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          attachment_context?:
            | Database["public"]["Enums"]["attachment_context"]
            | null
          category?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id?: string | null
          processed_at?: string | null
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
      lead_claims: {
        Row: {
          admin_notes: string | null
          assignment_id: string
          claim_reason: string
          created_at: string
          evidence_path: string | null
          id: string
          lawfirm_id: string
          lead_id: string
          reason_detail: string | null
          refund_amount: number | null
          refund_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          assignment_id: string
          claim_reason: string
          created_at?: string
          evidence_path?: string | null
          id?: string
          lawfirm_id: string
          lead_id: string
          reason_detail?: string | null
          refund_amount?: number | null
          refund_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          assignment_id?: string
          claim_reason?: string
          created_at?: string
          evidence_path?: string | null
          id?: string
          lawfirm_id?: string
          lead_id?: string
          reason_detail?: string | null
          refund_amount?: number | null
          refund_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_claims_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "lead_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_claims_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_claims_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
          is_demo: boolean | null
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
          specialty_id: string | null
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
          is_demo?: boolean | null
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
          specialty_id?: string | null
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
          is_demo?: boolean | null
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
          specialty_id?: string | null
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
          {
            foreignKeyName: "leads_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "master_specialties"
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
      marketplace_legal_areas: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
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
      master_active_provinces: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      master_case_statuses: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          is_final: boolean
          name: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_final?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_final?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      master_commission_history: {
        Row: {
          change_type: string
          changed_by: string | null
          commission_id: string
          created_at: string
          id: string
          new_percent: number | null
          old_percent: number | null
        }
        Insert: {
          change_type?: string
          changed_by?: string | null
          commission_id: string
          created_at?: string
          id?: string
          new_percent?: number | null
          old_percent?: number | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          commission_id?: string
          created_at?: string
          id?: string
          new_percent?: number | null
          old_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_commission_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_commission_history_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "master_lawfirm_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      master_global_rules: {
        Row: {
          allowed_models: string[]
          default_commission_percent: number
          id: string
          min_sellable_price: number
          min_sellable_score: number
          updated_at: string
        }
        Insert: {
          allowed_models?: string[]
          default_commission_percent?: number
          id?: string
          min_sellable_price?: number
          min_sellable_score?: number
          updated_at?: string
        }
        Update: {
          allowed_models?: string[]
          default_commission_percent?: number
          id?: string
          min_sellable_price?: number
          min_sellable_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      master_lawfirm_commissions: {
        Row: {
          commission_percent: number
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          lawfirm_id: string
          specialty_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          commission_percent: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          lawfirm_id: string
          specialty_id: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          lawfirm_id?: string
          specialty_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_lawfirm_commissions_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_lawfirm_commissions_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "master_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      master_legal_areas: {
        Row: {
          area_type: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          priority_order: number
          updated_at: string
          visible_marketplace: boolean
        }
        Insert: {
          area_type?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority_order?: number
          updated_at?: string
          visible_marketplace?: boolean
        }
        Update: {
          area_type?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority_order?: number
          updated_at?: string
          visible_marketplace?: boolean
        }
        Relationships: []
      }
      master_specialties: {
        Row: {
          allows_override: boolean
          commission_allowed: boolean
          created_at: string
          default_commission_percent: number | null
          direct_purchase_allowed: boolean
          id: string
          is_active: boolean
          is_commercial_vertical: boolean
          is_star: boolean
          name: string
          sort_order: number
          suggested_fixed_price: number | null
          updated_at: string
          visible_marketplace: boolean
        }
        Insert: {
          allows_override?: boolean
          commission_allowed?: boolean
          created_at?: string
          default_commission_percent?: number | null
          direct_purchase_allowed?: boolean
          id?: string
          is_active?: boolean
          is_commercial_vertical?: boolean
          is_star?: boolean
          name: string
          sort_order?: number
          suggested_fixed_price?: number | null
          updated_at?: string
          visible_marketplace?: boolean
        }
        Update: {
          allows_override?: boolean
          commission_allowed?: boolean
          created_at?: string
          default_commission_percent?: number | null
          direct_purchase_allowed?: boolean
          id?: string
          is_active?: boolean
          is_commercial_vertical?: boolean
          is_star?: boolean
          name?: string
          sort_order?: number
          suggested_fixed_price?: number | null
          updated_at?: string
          visible_marketplace?: boolean
        }
        Relationships: []
      }
      master_specialty_areas: {
        Row: {
          area_id: string
          id: string
          specialty_id: string
        }
        Insert: {
          area_id: string
          id?: string
          specialty_id: string
        }
        Update: {
          area_id?: string
          id?: string
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_specialty_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "master_legal_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_specialty_areas_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "master_specialties"
            referencedColumns: ["id"]
          },
        ]
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
      payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string
          id: string
          lawfirm_id: string | null
          lead_id: string | null
          metadata: Json | null
          payment_gateway: string
          status: string
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          lawfirm_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          payment_gateway?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          lawfirm_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          payment_gateway?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bar_association: string | null
          bar_number: string | null
          branch_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean | null
          lawfirm_id: string | null
          legal_areas: string[] | null
          phone: string | null
          theme_pref: Database["public"]["Enums"]["theme_pref"] | null
          updated_at: string | null
        }
        Insert: {
          bar_association?: string | null
          bar_number?: string | null
          branch_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_demo?: boolean | null
          lawfirm_id?: string | null
          legal_areas?: string[] | null
          phone?: string | null
          theme_pref?: Database["public"]["Enums"]["theme_pref"] | null
          updated_at?: string | null
        }
        Update: {
          bar_association?: string | null
          bar_number?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean | null
          lawfirm_id?: string | null
          legal_areas?: string[] | null
          phone?: string | null
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
      provider_applications: {
        Row: {
          accepts_commission_terms: boolean | null
          accepts_terms: boolean | null
          address: string | null
          category_id: string
          certifications: string[] | null
          cif: string | null
          city: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          languages: string[] | null
          legal_area_ids: string[] | null
          modality: string | null
          postal_code: string | null
          promo_description: string | null
          promo_discount_percent: number | null
          proposed_commission_percent: number | null
          provider_id: string | null
          province: string | null
          provinces_covered: string[] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          short_description: string | null
          status: string
          subcategory_ids: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accepts_commission_terms?: boolean | null
          accepts_terms?: boolean | null
          address?: string | null
          category_id: string
          certifications?: string[] | null
          cif?: string | null
          city?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          languages?: string[] | null
          legal_area_ids?: string[] | null
          modality?: string | null
          postal_code?: string | null
          promo_description?: string | null
          promo_discount_percent?: number | null
          proposed_commission_percent?: number | null
          provider_id?: string | null
          province?: string | null
          provinces_covered?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_description?: string | null
          status?: string
          subcategory_ids?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accepts_commission_terms?: boolean | null
          accepts_terms?: boolean | null
          address?: string | null
          category_id?: string
          certifications?: string[] | null
          cif?: string | null
          city?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          languages?: string[] | null
          legal_area_ids?: string[] | null
          modality?: string | null
          postal_code?: string | null
          promo_description?: string | null
          promo_discount_percent?: number | null
          proposed_commission_percent?: number | null
          provider_id?: string | null
          province?: string | null
          provinces_covered?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_description?: string | null
          status?: string
          subcategory_ids?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_applications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "provider_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_applications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      provider_legal_areas: {
        Row: {
          id: string
          legal_area_id: string
          provider_id: string
        }
        Insert: {
          id?: string
          legal_area_id: string
          provider_id: string
        }
        Update: {
          id?: string
          legal_area_id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_legal_areas_legal_area_id_fkey"
            columns: ["legal_area_id"]
            isOneToOne: false
            referencedRelation: "marketplace_legal_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_legal_areas_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_orders: {
        Row: {
          commission_amount: number
          commission_percent: number
          created_at: string | null
          id: string
          lawfirm_id: string
          notes: string | null
          provider_id: string
          provider_payout: number
          quantity: number | null
          service_id: string
          status: string
          total_price: number
          unit_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          commission_amount: number
          commission_percent: number
          created_at?: string | null
          id?: string
          lawfirm_id: string
          notes?: string | null
          provider_id: string
          provider_payout: number
          quantity?: number | null
          service_id: string
          status?: string
          total_price: number
          unit_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string | null
          id?: string
          lawfirm_id?: string
          notes?: string | null
          provider_id?: string
          provider_payout?: number
          quantity?: number | null
          service_id?: string
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_orders_lawfirm_id_fkey"
            columns: ["lawfirm_id"]
            isOneToOne: false
            referencedRelation: "lawfirms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          price_type: string
          promo_ends_at: string | null
          promo_label: string | null
          promo_price: number | null
          provider_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          price_type?: string
          promo_ends_at?: string | null
          promo_label?: string | null
          promo_price?: number | null
          provider_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          price_type?: string
          promo_ends_at?: string | null
          promo_label?: string | null
          promo_price?: number | null
          provider_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "provider_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_subcategory_links: {
        Row: {
          id: string
          provider_id: string
          subcategory_id: string
        }
        Insert: {
          id?: string
          provider_id: string
          subcategory_id: string
        }
        Update: {
          id?: string
          provider_id?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_subcategory_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_subcategory_links_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "provider_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          category_id: string
          certifications: string[] | null
          cif: string | null
          city: string | null
          commission_percent: number
          company_email: string | null
          company_phone: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_sponsored: boolean | null
          languages: string[] | null
          legal_area_ids: string[] | null
          logo_url: string | null
          modality: string | null
          name: string
          notes: string | null
          postal_code: string | null
          promo_description: string | null
          promo_discount_percent: number | null
          province: string | null
          provinces_covered: string[] | null
          rating: number | null
          response_time: string | null
          short_description: string | null
          status: string
          subcategory_ids: string[] | null
          total_orders: number | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          certifications?: string[] | null
          cif?: string | null
          city?: string | null
          commission_percent?: number
          company_email?: string | null
          company_phone?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_sponsored?: boolean | null
          languages?: string[] | null
          legal_area_ids?: string[] | null
          logo_url?: string | null
          modality?: string | null
          name: string
          notes?: string | null
          postal_code?: string | null
          promo_description?: string | null
          promo_discount_percent?: number | null
          province?: string | null
          provinces_covered?: string[] | null
          rating?: number | null
          response_time?: string | null
          short_description?: string | null
          status?: string
          subcategory_ids?: string[] | null
          total_orders?: number | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          certifications?: string[] | null
          cif?: string | null
          city?: string | null
          commission_percent?: number
          company_email?: string | null
          company_phone?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_sponsored?: boolean | null
          languages?: string[] | null
          legal_area_ids?: string[] | null
          logo_url?: string | null
          modality?: string | null
          name?: string
          notes?: string | null
          postal_code?: string | null
          promo_description?: string | null
          promo_discount_percent?: number | null
          province?: string | null
          provinces_covered?: string[] | null
          rating?: number | null
          response_time?: string | null
          short_description?: string | null
          status?: string
          subcategory_ids?: string[] | null
          total_orders?: number | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "provider_categories"
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
      get_lawfirm_api_key: { Args: { _lawfirm_id: string }; Returns: string }
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
      purchase_lead_atomic: {
        Args: {
          _commission_percent?: number
          _is_commission?: boolean
          _lawfirm_id: string
          _lead_id: string
          _user_id: string
        }
        Returns: Json
      }
      resolve_commission_origin: {
        Args: { _lawfirm_id: string; _specialty_id: string }
        Returns: string
      }
      resolve_commission_percent: {
        Args: { _lawfirm_id: string; _specialty_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "operator"
        | "lawfirm_admin"
        | "lawfirm_manager"
        | "lawfirm_lawyer"
        | "provider"
      attachment_category:
        | "datos_personales"
        | "notificaciones_juzgado"
        | "documentacion_caso"
        | "fotografias"
        | "comunicaciones"
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
        "provider",
      ],
      attachment_category: [
        "datos_personales",
        "notificaciones_juzgado",
        "documentacion_caso",
        "fotografias",
        "comunicaciones",
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
