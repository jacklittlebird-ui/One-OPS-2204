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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      abbreviations: {
        Row: {
          abbr: string
          created_at: string
          full_text: string
          id: string
        }
        Insert: {
          abbr?: string
          created_at?: string
          full_text?: string
          id?: string
        }
        Update: {
          abbr?: string
          created_at?: string
          full_text?: string
          id?: string
        }
        Relationships: []
      }
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          month: number
          notes: string | null
          period_end: string
          period_start: string
          reopened: boolean
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month: number
          notes?: string | null
          period_end: string
          period_start: string
          reopened?: boolean
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          reopened?: boolean
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      accruals_deferrals: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          credit_account_code: string | null
          currency: string
          debit_account_code: string | null
          description: string
          entry_no: string
          entry_type: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          period_month: number
          period_year: number
          posted_at: string | null
          reversal_journal_entry_id: string | null
          reverse_month: number
          reverse_year: number
          reversed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_account_code?: string | null
          currency?: string
          debit_account_code?: string | null
          description: string
          entry_no: string
          entry_type: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period_month: number
          period_year: number
          posted_at?: string | null
          reversal_journal_entry_id?: string | null
          reverse_month: number
          reverse_year: number
          reversed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_account_code?: string | null
          currency?: string
          debit_account_code?: string | null
          description?: string
          entry_no?: string
          entry_type?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period_month?: number
          period_year?: number
          posted_at?: string | null
          reversal_journal_entry_id?: string | null
          reverse_month?: number
          reverse_year?: number
          reversed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accruals_deferrals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accruals_deferrals_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accruals_deferrals_reversal_journal_entry_id_fkey"
            columns: ["reversal_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_types_ref: {
        Row: {
          category: string
          created_at: string
          iata: string
          icao: string
          id: string
          mtow: number
          name: string
          seats: string
        }
        Insert: {
          category?: string
          created_at?: string
          iata?: string
          icao?: string
          id?: string
          mtow?: number
          name?: string
          seats?: string
        }
        Update: {
          category?: string
          created_at?: string
          iata?: string
          icao?: string
          id?: string
          mtow?: number
          name?: string
          seats?: string
        }
        Relationships: []
      }
      aircrafts: {
        Row: {
          ac_type: string
          airline: string
          certificate_no: string
          created_at: string
          id: string
          issue_date: string | null
          model: string
          mtow: number
          registration: string
          seats: number
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          ac_type?: string
          airline?: string
          certificate_no?: string
          created_at?: string
          id?: string
          issue_date?: string | null
          model?: string
          mtow?: number
          registration?: string
          seats?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          ac_type?: string
          airline?: string
          certificate_no?: string
          created_at?: string
          id?: string
          issue_date?: string | null
          model?: string
          mtow?: number
          registration?: string
          seats?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      airline_airport_services: {
        Row: {
          airline_id: string
          airport_id: string
          buy_price: number
          created_at: string
          currency: string
          id: string
          notes: string
          provider_id: string | null
          sell_price: number
          service_id: string
          status: string
          unit: string
        }
        Insert: {
          airline_id: string
          airport_id: string
          buy_price?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string
          provider_id?: string | null
          sell_price?: number
          service_id: string
          status?: string
          unit?: string
        }
        Update: {
          airline_id?: string
          airport_id?: string
          buy_price?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string
          provider_id?: string | null
          sell_price?: number
          service_id?: string
          status?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "airline_airport_services_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airline_airport_services_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airline_airport_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airline_airport_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      airline_incentives: {
        Row: {
          airline_id: string
          created_at: string
          currency: string
          description: string
          end_date: string | null
          id: string
          incentive_type: Database["public"]["Enums"]["incentive_type"]
          max_amount: number
          period: Database["public"]["Enums"]["incentive_period"]
          rate: number
          start_date: string
          status: string
          threshold: number
          updated_at: string
        }
        Insert: {
          airline_id: string
          created_at?: string
          currency?: string
          description?: string
          end_date?: string | null
          id?: string
          incentive_type?: Database["public"]["Enums"]["incentive_type"]
          max_amount?: number
          period?: Database["public"]["Enums"]["incentive_period"]
          rate?: number
          start_date?: string
          status?: string
          threshold?: number
          updated_at?: string
        }
        Update: {
          airline_id?: string
          created_at?: string
          currency?: string
          description?: string
          end_date?: string | null
          id?: string
          incentive_type?: Database["public"]["Enums"]["incentive_type"]
          max_amount?: number
          period?: Database["public"]["Enums"]["incentive_period"]
          rate?: number
          start_date?: string
          status?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "airline_incentives_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
        ]
      }
      airlines: {
        Row: {
          alliance: string
          billing_currency: string
          code: string
          contact_person: string
          country: string
          created_at: string
          credit_terms: string
          email: string
          iata_code: string
          icao_code: string
          id: string
          name: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          alliance?: string
          billing_currency?: string
          code?: string
          contact_person?: string
          country?: string
          created_at?: string
          credit_terms?: string
          email?: string
          iata_code?: string
          icao_code?: string
          id?: string
          name: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Update: {
          alliance?: string
          billing_currency?: string
          code?: string
          contact_person?: string
          country?: string
          created_at?: string
          credit_terms?: string
          email?: string
          iata_code?: string
          icao_code?: string
          id?: string
          name?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      airport_charges: {
        Row: {
          air_navigation: number
          created_at: string
          housing: number
          id: string
          landing_day: number
          landing_night: number
          mtow: string
          parking_day: number
          parking_night: number
          vendor_name: string
        }
        Insert: {
          air_navigation?: number
          created_at?: string
          housing?: number
          id?: string
          landing_day?: number
          landing_night?: number
          mtow?: string
          parking_day?: number
          parking_night?: number
          vendor_name?: string
        }
        Update: {
          air_navigation?: number
          created_at?: string
          housing?: number
          id?: string
          landing_day?: number
          landing_night?: number
          mtow?: string
          parking_day?: number
          parking_night?: number
          vendor_name?: string
        }
        Relationships: []
      }
      airport_tax: {
        Row: {
          amount: string
          applicability: string
          created_at: string
          egp_all: string
          id: string
          is_total: boolean
          section: string
          sort_order: number
          tax: string
          unit: string
          usd_except_ssh: string
          usd_ssh: string
        }
        Insert: {
          amount?: string
          applicability?: string
          created_at?: string
          egp_all?: string
          id?: string
          is_total?: boolean
          section?: string
          sort_order?: number
          tax?: string
          unit?: string
          usd_except_ssh?: string
          usd_ssh?: string
        }
        Update: {
          amount?: string
          applicability?: string
          created_at?: string
          egp_all?: string
          id?: string
          is_total?: boolean
          section?: string
          sort_order?: number
          tax?: string
          unit?: string
          usd_except_ssh?: string
          usd_ssh?: string
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string
          country_id: string
          created_at: string
          iata_code: string
          icao_code: string
          id: string
          name: string
          status: string
          terminal_count: number
        }
        Insert: {
          city?: string
          country_id: string
          created_at?: string
          iata_code?: string
          icao_code?: string
          id?: string
          name: string
          status?: string
          terminal_count?: number
        }
        Update: {
          city?: string
          country_id?: string
          created_at?: string
          iata_code?: string
          icao_code?: string
          id?: string
          name?: string
          status?: string
          terminal_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "airports_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          acted_at: string
          action: string
          approver_id: string | null
          approver_role: string | null
          comment: string | null
          id: string
          request_id: string
          step: number
        }
        Insert: {
          acted_at?: string
          action: string
          approver_id?: string | null
          approver_role?: string | null
          comment?: string | null
          id?: string
          request_id: string
          step: number
        }
        Update: {
          acted_at?: string
          action?: string
          approver_id?: string | null
          approver_role?: string | null
          comment?: string | null
          id?: string
          request_id?: string
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          amount: number
          approver_roles: string[]
          company_id: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          current_step: number
          doc_id: string
          doc_reference: string | null
          doc_type: string
          id: string
          notes: string | null
          request_no: string
          rule_id: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          total_steps: number
          updated_at: string
        }
        Insert: {
          amount?: number
          approver_roles?: string[]
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          current_step?: number
          doc_id: string
          doc_reference?: string | null
          doc_type: string
          id?: string
          notes?: string | null
          request_no: string
          rule_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          total_steps?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          approver_roles?: string[]
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          current_step?: number
          doc_id?: string
          doc_reference?: string | null
          doc_type?: string
          id?: string
          notes?: string | null
          request_no?: string
          rule_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          total_steps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          active: boolean
          approver_roles: string[]
          company_id: string | null
          created_at: string
          currency: string | null
          doc_type: string
          id: string
          max_amount: number | null
          min_amount: number
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          approver_roles?: string[]
          company_id?: string | null
          created_at?: string
          currency?: string | null
          doc_type: string
          id?: string
          max_amount?: number | null
          min_amount?: number
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          approver_roles?: string[]
          company_id?: string | null
          created_at?: string
          currency?: string | null
          doc_type?: string
          id?: string
          max_amount?: number | null
          min_amount?: number
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_disposals: {
        Row: {
          accumulated_depreciation: number | null
          approved_by: string | null
          asset_id: string
          book_value: number | null
          buyer: string | null
          created_at: string
          created_by: string | null
          disposal_amount: number | null
          disposal_date: string
          disposal_type: string
          gain_loss: number | null
          id: string
          reason: string | null
          reference_no: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accumulated_depreciation?: number | null
          approved_by?: string | null
          asset_id: string
          book_value?: number | null
          buyer?: string | null
          created_at?: string
          created_by?: string | null
          disposal_amount?: number | null
          disposal_date?: string
          disposal_type: string
          gain_loss?: number | null
          id?: string
          reason?: string | null
          reference_no?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accumulated_depreciation?: number | null
          approved_by?: string | null
          asset_id?: string
          book_value?: number | null
          buyer?: string | null
          created_at?: string
          created_by?: string | null
          disposal_amount?: number | null
          disposal_date?: string
          disposal_type?: string
          gain_loss?: number | null
          id?: string
          reason?: string | null
          reference_no?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_disposals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_physical_count_lines: {
        Row: {
          actual_location: string | null
          asset_id: string | null
          condition: string | null
          count_id: string
          created_at: string
          expected_location: string | null
          found: boolean
          id: string
          notes: string | null
          scanned_code: string | null
          variance: string | null
        }
        Insert: {
          actual_location?: string | null
          asset_id?: string | null
          condition?: string | null
          count_id: string
          created_at?: string
          expected_location?: string | null
          found?: boolean
          id?: string
          notes?: string | null
          scanned_code?: string | null
          variance?: string | null
        }
        Update: {
          actual_location?: string | null
          asset_id?: string | null
          condition?: string | null
          count_id?: string
          created_at?: string
          expected_location?: string | null
          found?: boolean
          id?: string
          notes?: string | null
          scanned_code?: string | null
          variance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_physical_count_lines_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_physical_count_lines_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "asset_physical_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_physical_counts: {
        Row: {
          count_date: string
          count_no: string
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          location: string | null
          notes: string | null
          performed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          count_date?: string
          count_no: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          performed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          count_date?: string
          count_no?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          performed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_transfers: {
        Row: {
          approved_by: string | null
          asset_id: string
          created_at: string
          created_by: string | null
          from_custodian: string | null
          from_department: string | null
          from_location: string | null
          id: string
          reason: string | null
          reference_no: string | null
          status: string
          to_custodian: string | null
          to_department: string | null
          to_location: string
          transfer_date: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          asset_id: string
          created_at?: string
          created_by?: string | null
          from_custodian?: string | null
          from_department?: string | null
          from_location?: string | null
          id?: string
          reason?: string | null
          reference_no?: string | null
          status?: string
          to_custodian?: string | null
          to_department?: string | null
          to_location: string
          transfer_date?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          created_by?: string | null
          from_custodian?: string | null
          from_department?: string | null
          from_location?: string | null
          id?: string
          reason?: string | null
          reference_no?: string | null
          status?: string
          to_custodian?: string | null
          to_department?: string | null
          to_location?: string
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string
          user_agent: string
          user_email: string
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string
          user_agent?: string
          user_email?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string
          user_agent?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string
          branch: string | null
          company_id: string | null
          created_at: string
          currency: string
          current_balance: number
          iban: string | null
          id: string
          notes: string | null
          opening_balance: number
          status: string
          swift: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name: string
          branch?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          iban?: string | null
          id?: string
          notes?: string | null
          opening_balance?: number
          status?: string
          swift?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string
          branch?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          iban?: string | null
          id?: string
          notes?: string | null
          opening_balance?: number
          status?: string
          swift?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          bank_account_id: string
          created_at: string
          difference: number
          id: string
          notes: string | null
          statement_balance: number
          statement_date: string
          status: string
          system_balance: number
          updated_at: string
        }
        Insert: {
          bank_account_id: string
          created_at?: string
          difference?: number
          id?: string
          notes?: string | null
          statement_balance?: number
          statement_date: string
          status?: string
          system_balance?: number
          updated_at?: string
        }
        Update: {
          bank_account_id?: string
          created_at?: string
          difference?: number
          id?: string
          notes?: string | null
          statement_balance?: number
          statement_date?: string
          status?: string
          system_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transfers: {
        Row: {
          amount: number
          company_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          fees: number
          from_bank_id: string | null
          from_cash_id: string | null
          id: string
          matched_invoices: Json
          notes: string | null
          payment_type: string | null
          reference: string | null
          service_type: string | null
          status: string
          supplier_bank_profile_id: string | null
          supplier_category: string | null
          supplier_id: string | null
          to_bank_id: string | null
          to_cash_id: string | null
          transfer_date: string
          transfer_no: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          fees?: number
          from_bank_id?: string | null
          from_cash_id?: string | null
          id?: string
          matched_invoices?: Json
          notes?: string | null
          payment_type?: string | null
          reference?: string | null
          service_type?: string | null
          status?: string
          supplier_bank_profile_id?: string | null
          supplier_category?: string | null
          supplier_id?: string | null
          to_bank_id?: string | null
          to_cash_id?: string | null
          transfer_date?: string
          transfer_no: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          fees?: number
          from_bank_id?: string | null
          from_cash_id?: string | null
          id?: string
          matched_invoices?: Json
          notes?: string | null
          payment_type?: string | null
          reference?: string | null
          service_type?: string | null
          status?: string
          supplier_bank_profile_id?: string | null
          supplier_category?: string | null
          supplier_id?: string | null
          to_bank_id?: string | null
          to_cash_id?: string | null
          transfer_date?: string
          transfer_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_from_bank_id_fkey"
            columns: ["from_bank_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_from_cash_id_fkey"
            columns: ["from_cash_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_supplier_bank_profile_id_fkey"
            columns: ["supplier_bank_profile_id"]
            isOneToOne: false
            referencedRelation: "supplier_bank_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_to_bank_id_fkey"
            columns: ["to_bank_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_to_cash_id_fkey"
            columns: ["to_cash_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      basic_ramp: {
        Row: {
          created_at: string
          id: string
          price: string
          service: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: string
          service?: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: string
          service?: string
          unit?: string
        }
        Relationships: []
      }
      budget_entries: {
        Row: {
          account_code: string
          account_name: string | null
          alert_threshold_pct: number | null
          budget_amount: number
          company_id: string | null
          cost_center: string | null
          created_at: string
          created_by: string | null
          currency: string
          fiscal_year: number
          id: string
          notes: string | null
          period_month: number
          station_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name?: string | null
          alert_threshold_pct?: number | null
          budget_amount?: number
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fiscal_year: number
          id?: string
          notes?: string | null
          period_month: number
          station_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string | null
          alert_threshold_pct?: number | null
          budget_amount?: number
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          period_month?: number
          station_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_variance_alerts: {
        Row: {
          account_code: string
          account_name: string | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_amount: number
          budget_amount: number
          company_id: string | null
          cost_center: string | null
          created_at: string
          fiscal_year: number
          id: string
          notes: string | null
          period_month: number
          severity: string
          status: string
          threshold_pct: number
          updated_at: string
          variance_amount: number
          variance_pct: number
        }
        Insert: {
          account_code: string
          account_name?: string | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_amount?: number
          budget_amount?: number
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          fiscal_year: number
          id?: string
          notes?: string | null
          period_month: number
          severity?: string
          status?: string
          threshold_pct?: number
          updated_at?: string
          variance_amount?: number
          variance_pct?: number
        }
        Update: {
          account_code?: string
          account_name?: string | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_amount?: number
          budget_amount?: number
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          period_month?: number
          severity?: string
          status?: string
          threshold_pct?: number
          updated_at?: string
          variance_amount?: number
          variance_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_variance_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletins: {
        Row: {
          acknowledged_by: string
          bulletin_id: string
          category_code: string
          created_at: string
          description: string
          effective_date: string | null
          expiry_date: string | null
          id: string
          issued_by: string
          issued_date: string | null
          priority: string
          recipients: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          acknowledged_by?: string
          bulletin_id?: string
          category_code?: string
          created_at?: string
          description?: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          issued_by?: string
          issued_date?: string | null
          priority?: string
          recipients?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          acknowledged_by?: string
          bulletin_id?: string
          category_code?: string
          created_at?: string
          description?: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          issued_by?: string
          issued_date?: string | null
          priority?: string
          recipients?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_accounts: {
        Row: {
          account_name: string
          company_id: string | null
          created_at: string
          currency: string
          current_balance: number
          custodian: string | null
          custody_type: string
          id: string
          location: string | null
          notes: string | null
          opening_balance: number
          original_amount: number
          station_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          custodian?: string | null
          custody_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          opening_balance?: number
          original_amount?: number
          station_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          custodian?: string | null
          custody_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          opening_balance?: number
          original_amount?: number
          station_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_accounts_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_items: {
        Row: {
          category: string
          created_at: string
          id: string
          item: string
          price: string
          unit: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          item?: string
          price?: string
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item?: string
          price?: string
          unit?: string
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          company_id: string | null
          created_at: string
          currency: string
          current_balance: number
          description: string
          id: string
          is_group: boolean
          level: number
          name: string
          name_ar: string
          opening_balance: number
          parent_id: string | null
          requires_flight_link: boolean
          status: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          description?: string
          id?: string
          is_group?: boolean
          level?: number
          name: string
          name_ar?: string
          opening_balance?: number
          parent_id?: string | null
          requires_flight_link?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          description?: string
          id?: string
          is_group?: boolean
          level?: number
          name?: string
          name_ar?: string
          opening_balance?: number
          parent_id?: string | null
          requires_flight_link?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cheque_books: {
        Row: {
          bank_account_id: string
          created_at: string
          end_number: number
          id: string
          next_number: number
          notes: string | null
          series_prefix: string | null
          start_number: number
          status: string
          updated_at: string
        }
        Insert: {
          bank_account_id: string
          created_at?: string
          end_number: number
          id?: string
          next_number: number
          notes?: string | null
          series_prefix?: string | null
          start_number: number
          status?: string
          updated_at?: string
        }
        Update: {
          bank_account_id?: string
          created_at?: string
          end_number?: number
          id?: string
          next_number?: number
          notes?: string | null
          series_prefix?: string | null
          start_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheque_books_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques: {
        Row: {
          amount: number
          bank_account_id: string | null
          bounce_reason: string | null
          bounced_date: string | null
          cheque_book_id: string | null
          cheque_number: string
          cleared_date: string | null
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          due_date: string | null
          id: string
          issue_date: string
          notes: string | null
          party_name: string
          payment_id: string | null
          receipt_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          bounce_reason?: string | null
          bounced_date?: string | null
          cheque_book_id?: string | null
          cheque_number: string
          cleared_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          party_name: string
          payment_id?: string | null
          receipt_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bounce_reason?: string | null
          bounced_date?: string | null
          cheque_book_id?: string | null
          cheque_number?: string
          cleared_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          party_name?: string
          payment_id?: string | null
          receipt_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheques_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_cheque_book_id_fkey"
            columns: ["cheque_book_id"]
            isOneToOne: false
            referencedRelation: "cheque_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques_under_collection: {
        Row: {
          amount: number
          bank_account_id: string | null
          cheque_date: string
          cheque_no: string
          cleared_date: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["finance_currency"]
          customer_id: string | null
          customer_name: string | null
          deposit_date: string | null
          drawn_on_bank: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          received_date: string
          status: Database["public"]["Enums"]["collection_cheque_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cheque_date: string
          cheque_no: string
          cleared_date?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["finance_currency"]
          customer_id?: string | null
          customer_name?: string | null
          deposit_date?: string | null
          drawn_on_bank?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          received_date?: string
          status?: Database["public"]["Enums"]["collection_cheque_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cheque_date?: string
          cheque_no?: string
          cleared_date?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["finance_currency"]
          customer_id?: string | null
          customer_name?: string | null
          deposit_date?: string | null
          drawn_on_bank?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          received_date?: string
          status?: Database["public"]["Enums"]["collection_cheque_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheques_under_collection_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_under_collection_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_under_collection_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_under_collection_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_under_collection_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_customer_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_activities: {
        Row: {
          activity_type: string
          case_id: string
          contact_person: string | null
          created_at: string
          id: string
          next_action_date: string | null
          notes: string | null
          outcome: string | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          case_id: string
          contact_person?: string | null
          created_at?: string
          id?: string
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          case_id?: string
          contact_person?: string | null
          created_at?: string
          id?: string
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "collection_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_cases: {
        Row: {
          aging_bucket: string
          amount_outstanding: number
          assigned_to: string | null
          case_type: string
          counterparty_id: string | null
          counterparty_name: string
          created_at: string
          currency: string
          days_overdue: number
          due_date: string | null
          dunning_stage: string
          id: string
          invoice_id: string | null
          last_contact_date: string | null
          next_action_date: string | null
          notes: string | null
          promise_to_pay_amount: number | null
          promise_to_pay_date: string | null
          status: string
          updated_at: string
          vendor_invoice_id: string | null
        }
        Insert: {
          aging_bucket?: string
          amount_outstanding?: number
          assigned_to?: string | null
          case_type: string
          counterparty_id?: string | null
          counterparty_name: string
          created_at?: string
          currency?: string
          days_overdue?: number
          due_date?: string | null
          dunning_stage?: string
          id?: string
          invoice_id?: string | null
          last_contact_date?: string | null
          next_action_date?: string | null
          notes?: string | null
          promise_to_pay_amount?: number | null
          promise_to_pay_date?: string | null
          status?: string
          updated_at?: string
          vendor_invoice_id?: string | null
        }
        Update: {
          aging_bucket?: string
          amount_outstanding?: number
          assigned_to?: string | null
          case_type?: string
          counterparty_id?: string | null
          counterparty_name?: string
          created_at?: string
          currency?: string
          days_overdue?: number
          due_date?: string | null
          dunning_stage?: string
          id?: string
          invoice_id?: string | null
          last_contact_date?: string | null
          next_action_date?: string | null
          notes?: string | null
          promise_to_pay_amount?: number | null
          promise_to_pay_date?: string | null
          status?: string
          updated_at?: string
          vendor_invoice_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          base_currency: Database["public"]["Enums"]["finance_currency"]
          code: string
          country: string | null
          created_at: string
          id: string
          is_headquarters: boolean
          name: string
          name_ar: string | null
          status: string
          updated_at: string
        }
        Insert: {
          base_currency: Database["public"]["Enums"]["finance_currency"]
          code: string
          country?: string | null
          created_at?: string
          id?: string
          is_headquarters?: boolean
          name: string
          name_ar?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          base_currency?: Database["public"]["Enums"]["finance_currency"]
          code?: string
          country?: string | null
          created_at?: string
          id?: string
          is_headquarters?: boolean
          name?: string
          name_ar?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      consolidation_runs: {
        Row: {
          base_currency: string
          created_at: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          run_no: string
          status: string
          total_elimination: number
          total_minority_interest: number
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          run_no: string
          status?: string
          total_elimination?: number
          total_minority_interest?: number
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          run_no?: string
          status?: string
          total_elimination?: number
          total_minority_interest?: number
          updated_at?: string
        }
        Relationships: []
      }
      contract_renewal_events: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          new_end_date: string | null
          notes: string | null
          previous_end_date: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type: string
          id?: string
          new_end_date?: string | null
          notes?: string | null
          previous_end_date?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          new_end_date?: string | null
          notes?: string | null
          previous_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_renewal_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_service_rates: {
        Row: {
          airport: string
          contract_id: string
          created_at: string
          currency: string
          duration_hours: number
          flight_type: string
          id: string
          included_hours: number
          notes: string
          overtime_rate: number
          rate: number
          service_type: string
          sort_order: number
          staff_count: number
          unit: string
        }
        Insert: {
          airport?: string
          contract_id: string
          created_at?: string
          currency?: string
          duration_hours?: number
          flight_type?: string
          id?: string
          included_hours?: number
          notes?: string
          overtime_rate?: number
          rate?: number
          service_type?: string
          sort_order?: number
          staff_count?: number
          unit?: string
        }
        Update: {
          airport?: string
          contract_id?: string
          created_at?: string
          currency?: string
          duration_hours?: number
          flight_type?: string
          id?: string
          included_hours?: number
          notes?: string
          overtime_rate?: number
          rate?: number
          service_type?: string
          sort_order?: number
          staff_count?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_service_rates_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_sla_incidents: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          incident_date: string
          incident_type: string
          resolved: boolean
          resolved_at: string | null
          response_time_hours: number | null
          severity: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incident_date?: string
          incident_type: string
          resolved?: boolean
          resolved_at?: string | null
          response_time_hours?: number | null
          severity?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incident_date?: string
          incident_type?: string
          resolved?: boolean
          resolved_at?: string | null
          response_time_hours?: number | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_sla_incidents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          airline: string
          airline_iata: string | null
          annual_value: number
          auto_renew: boolean
          base_flat_fee: number
          billing_frequency: string
          company_id: string | null
          contact_email: string
          contact_person: string
          contract_no: string
          contract_type: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          default_team_size: string
          end_date: string
          id: string
          last_renewed_at: string | null
          notes: string | null
          overtime_rate: number
          payment_terms: string
          renewal_notice_days: number | null
          renewal_status: string | null
          service_category: string
          service_scope: string
          services: string | null
          sgha_ref: string
          sla_response_hours: number | null
          sla_uptime_target: number | null
          start_date: string
          stations: string | null
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          airline: string
          airline_iata?: string | null
          annual_value?: number
          auto_renew?: boolean
          base_flat_fee?: number
          billing_frequency?: string
          company_id?: string | null
          contact_email?: string
          contact_person?: string
          contract_no: string
          contract_type?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          default_team_size?: string
          end_date: string
          id?: string
          last_renewed_at?: string | null
          notes?: string | null
          overtime_rate?: number
          payment_terms?: string
          renewal_notice_days?: number | null
          renewal_status?: string | null
          service_category?: string
          service_scope?: string
          services?: string | null
          sgha_ref?: string
          sla_response_hours?: number | null
          sla_uptime_target?: number | null
          start_date: string
          stations?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          airline?: string
          airline_iata?: string | null
          annual_value?: number
          auto_renew?: boolean
          base_flat_fee?: number
          billing_frequency?: string
          company_id?: string | null
          contact_email?: string
          contact_person?: string
          contract_no?: string
          contract_type?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          default_team_size?: string
          end_date?: string
          id?: string
          last_renewed_at?: string | null
          notes?: string | null
          overtime_rate?: number
          payment_terms?: string
          renewal_notice_days?: number | null
          renewal_status?: string | null
          service_category?: string
          service_scope?: string
          services?: string | null
          sgha_ref?: string
          sla_response_hours?: number | null
          sla_uptime_target?: number | null
          start_date?: string
          stations?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_allocation_rule_lines: {
        Row: {
          created_at: string
          id: string
          percentage: number | null
          rule_id: string
          target_account_code: string | null
          target_company: string
          target_cost_center: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          percentage?: number | null
          rule_id: string
          target_account_code?: string | null
          target_company: string
          target_cost_center?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          percentage?: number | null
          rule_id?: string
          target_account_code?: string | null
          target_company?: string
          target_cost_center?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_allocation_rule_lines_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cost_allocation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_allocation_rules: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          driver: string | null
          id: string
          method: string
          name: string
          source_account_code: string
          source_company: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver?: string | null
          id?: string
          method?: string
          name: string
          source_account_code: string
          source_company?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver?: string | null
          id?: string
          method?: string
          name?: string
          source_account_code?: string
          source_company?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cost_allocation_runs: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          distribution: Json
          id: string
          journal_entry_id: string | null
          notes: string | null
          period: string
          rule_id: string
          source_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          distribution?: Json
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period: string
          rule_id: string
          source_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          distribution?: Json
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period?: string
          rule_id?: string
          source_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_allocation_runs_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_allocation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cost_allocation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_report_lines: {
        Row: {
          cost_report_id: string
          created_at: string
          description: string
          details: Json
          id: string
          item_type: string
          quantity: number
          sort_order: number
          total_cost: number
          total_selling: number
          unit: string | null
          unit_cost: number
          unit_selling: number
        }
        Insert: {
          cost_report_id: string
          created_at?: string
          description?: string
          details?: Json
          id?: string
          item_type: string
          quantity?: number
          sort_order?: number
          total_cost?: number
          total_selling?: number
          unit?: string | null
          unit_cost?: number
          unit_selling?: number
        }
        Update: {
          cost_report_id?: string
          created_at?: string
          description?: string
          details?: Json
          id?: string
          item_type?: string
          quantity?: number
          sort_order?: number
          total_cost?: number
          total_selling?: number
          unit?: string | null
          unit_cost?: number
          unit_selling?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_report_lines_cost_report_id_fkey"
            columns: ["cost_report_id"]
            isOneToOne: false
            referencedRelation: "cost_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_reports: {
        Row: {
          airline_id: string | null
          billed_invoice_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["finance_currency"]
          flight_schedule_id: string | null
          id: string
          margin: number | null
          report_date: string
          report_no: string
          service_report_id: string | null
          service_type: string
          source: string
          station_id: string | null
          status: string
          supplier_id: string | null
          total_cost: number
          total_selling: number
          updated_at: string
        }
        Insert: {
          airline_id?: string | null
          billed_invoice_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["finance_currency"]
          flight_schedule_id?: string | null
          id?: string
          margin?: number | null
          report_date?: string
          report_no: string
          service_report_id?: string | null
          service_type: string
          source?: string
          station_id?: string | null
          status?: string
          supplier_id?: string | null
          total_cost?: number
          total_selling?: number
          updated_at?: string
        }
        Update: {
          airline_id?: string | null
          billed_invoice_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["finance_currency"]
          flight_schedule_id?: string | null
          id?: string
          margin?: number | null
          report_date?: string
          report_no?: string
          service_report_id?: string | null
          service_type?: string
          source?: string
          station_id?: string | null
          status?: string
          supplier_id?: string | null
          total_cost?: number
          total_selling?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_reports_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_reports_billed_invoice_id_fkey"
            columns: ["billed_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_reports_billed_invoice_id_fkey"
            columns: ["billed_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_reports_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_reports_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          name_ar: string
          region: string
          status: string
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          name: string
          name_ar?: string
          region?: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          name_ar?: string
          region?: string
          status?: string
        }
        Relationships: []
      }
      custom_report_definitions: {
        Row: {
          chart_config: Json | null
          chart_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          filters: Json
          group_by: Json
          id: string
          is_shared: boolean
          last_run_at: string | null
          name: string
          schedule_cron: string | null
          schedule_recipients: string[] | null
          sort: Json
          source: string
          updated_at: string
        }
        Insert: {
          chart_config?: Json | null
          chart_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          filters?: Json
          group_by?: Json
          id?: string
          is_shared?: boolean
          last_run_at?: string | null
          name: string
          schedule_cron?: string | null
          schedule_recipients?: string[] | null
          sort?: Json
          source: string
          updated_at?: string
        }
        Update: {
          chart_config?: Json | null
          chart_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          filters?: Json
          group_by?: Json
          id?: string
          is_shared?: boolean
          last_run_at?: string | null
          name?: string
          schedule_cron?: string | null
          schedule_recipients?: string[] | null
          sort?: Json
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_report_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          export_path: string | null
          id: string
          report_id: string
          row_count: number | null
          run_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          export_path?: string | null
          id?: string
          report_id: string
          row_count?: number | null
          run_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          export_path?: string | null
          id?: string
          report_id?: string
          row_count?: number | null
          run_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_report_runs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "custom_report_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_price_list: {
        Row: {
          airline_iata: string | null
          airline_id: string | null
          company_id: string | null
          contract_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["finance_currency"]
          end_date: string | null
          id: string
          notes: string | null
          service_type: string
          start_date: string | null
          station_code: string | null
          status: string
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          airline_iata?: string | null
          airline_id?: string | null
          company_id?: string | null
          contract_id?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["finance_currency"]
          end_date?: string | null
          id?: string
          notes?: string | null
          service_type: string
          start_date?: string | null
          station_code?: string | null
          status?: string
          unit?: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          airline_iata?: string | null
          airline_id?: string | null
          company_id?: string | null
          contract_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["finance_currency"]
          end_date?: string | null
          id?: string
          notes?: string | null
          service_type?: string
          start_date?: string | null
          station_code?: string | null
          status?: string
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_price_list_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_list_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_list_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_users: {
        Row: {
          airline_iata: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          airline_iata: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          airline_iata?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delay_codes: {
        Row: {
          active: boolean
          avg_minutes: number
          category: string
          code: string
          created_at: string
          description: string
          id: string
          impact_level: string
          responsible: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          avg_minutes?: number
          category?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          impact_level?: string
          responsible?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          avg_minutes?: number
          category?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          impact_level?: string
          responsible?: string
          updated_at?: string
        }
        Relationships: []
      }
      depreciation_entries: {
        Row: {
          asset_id: string
          created_at: string
          depreciation_amount: number
          id: string
          journal_entry_id: string | null
          notes: string | null
          period_month: number
          period_year: number
          posted_at: string
          posted_by: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          depreciation_amount?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period_month: number
          period_year: number
          posted_at?: string
          posted_by?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          depreciation_amount?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period_month?: number
          period_year?: number
          posted_at?: string
          posted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_entries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_assignments: {
        Row: {
          actual_duration_hours: number
          actual_end: string
          actual_start: string
          base_fee: number
          charges_breakdown: Json
          charges_currency: string
          contract_duration_hours: number
          contract_id: string | null
          created_at: string
          created_via: string | null
          dispatched_by: string
          extra_manpower_count: number
          flight_date: string
          flight_schedule_id: string | null
          id: string
          irregularity_id: string | null
          notes: string
          overtime_charge: number
          overtime_hours: number
          overtime_rate: number
          ramp_vehicle_trips: number
          return_to_ramp_with_load: boolean
          review_comment: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string
          scheduled_end: string
          scheduled_start: string
          service_rate: number
          short_notice: boolean
          staff_count: number
          staff_names: string
          status: string
          task_sheet_data: Json | null
          total_charge: number
          total_security_charges: number
          updated_at: string
        }
        Insert: {
          actual_duration_hours?: number
          actual_end?: string
          actual_start?: string
          base_fee?: number
          charges_breakdown?: Json
          charges_currency?: string
          contract_duration_hours?: number
          contract_id?: string | null
          created_at?: string
          created_via?: string | null
          dispatched_by?: string
          extra_manpower_count?: number
          flight_date?: string
          flight_schedule_id?: string | null
          id?: string
          irregularity_id?: string | null
          notes?: string
          overtime_charge?: number
          overtime_hours?: number
          overtime_rate?: number
          ramp_vehicle_trips?: number
          return_to_ramp_with_load?: boolean
          review_comment?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string
          scheduled_end?: string
          scheduled_start?: string
          service_rate?: number
          short_notice?: boolean
          staff_count?: number
          staff_names?: string
          status?: string
          task_sheet_data?: Json | null
          total_charge?: number
          total_security_charges?: number
          updated_at?: string
        }
        Update: {
          actual_duration_hours?: number
          actual_end?: string
          actual_start?: string
          base_fee?: number
          charges_breakdown?: Json
          charges_currency?: string
          contract_duration_hours?: number
          contract_id?: string | null
          created_at?: string
          created_via?: string | null
          dispatched_by?: string
          extra_manpower_count?: number
          flight_date?: string
          flight_schedule_id?: string | null
          id?: string
          irregularity_id?: string | null
          notes?: string
          overtime_charge?: number
          overtime_hours?: number
          overtime_rate?: number
          ramp_vehicle_trips?: number
          return_to_ramp_with_load?: boolean
          review_comment?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string
          scheduled_end?: string
          scheduled_start?: string
          service_rate?: number
          short_notice?: boolean
          staff_count?: number
          staff_names?: string
          status?: string
          task_sheet_data?: Json | null
          total_charge?: number
          total_security_charges?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_assignments_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "flight_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_assignments_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["flight_schedule_id"]
          },
          {
            foreignKeyName: "dispatch_assignments_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_dispatch_with_flight"
            referencedColumns: ["fs_id"]
          },
          {
            foreignKeyName: "dispatch_assignments_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["fs_id"]
          },
          {
            foreignKeyName: "dispatch_assignments_irregularity_id_fkey"
            columns: ["irregularity_id"]
            isOneToOne: false
            referencedRelation: "irregularity_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          created_at: string
          document_id: string
          id: string
          ip_address: string | null
          notes: string | null
          order_index: number
          requested_by: string | null
          role_label: string | null
          signature_data: string | null
          signed_at: string | null
          signer_email: string | null
          signer_name: string
          signer_user_id: string | null
          status: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          order_index?: number
          requested_by?: string | null
          role_label?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name: string
          signer_user_id?: string | null
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          order_index?: number
          requested_by?: string | null
          role_label?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string
          signer_user_id?: string | null
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          storage_path: string
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          document_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path: string
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          document_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path?: string
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          current_version: number
          description: string | null
          entity_id: string | null
          entity_type: string | null
          expiry_date: string | null
          id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          current_version?: number
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expiry_date?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          current_version?: number
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expiry_date?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      dunning_policies: {
        Row: {
          created_at: string
          days_overdue: number
          email_body: string
          email_subject: string
          id: string
          is_active: boolean
          level: number
          name: string
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_overdue: number
          email_body: string
          email_subject: string
          id?: string
          is_active?: boolean
          level: number
          name: string
          tone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_overdue?: number
          email_body?: string
          email_subject?: string
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      elimination_entries: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          entry_type: string
          from_account_id: string | null
          from_company_id: string | null
          ic_transaction_id: string | null
          id: string
          run_id: string
          to_account_id: string | null
          to_company_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type: string
          from_account_id?: string | null
          from_company_id?: string | null
          ic_transaction_id?: string | null
          id?: string
          run_id: string
          to_account_id?: string | null
          to_company_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type?: string
          from_account_id?: string | null
          from_company_id?: string | null
          ic_transaction_id?: string | null
          id?: string
          run_id?: string
          to_account_id?: string | null
          to_company_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elimination_entries_ic_transaction_id_fkey"
            columns: ["ic_transaction_id"]
            isOneToOne: false
            referencedRelation: "intercompany_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elimination_entries_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "consolidation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      eta_submissions: {
        Row: {
          accepted_at: string | null
          created_at: string
          document_type: string
          environment: string
          error_message: string | null
          id: string
          internal_id: string | null
          invoice_id: string | null
          long_id: string | null
          payload: Json | null
          rejected_at: string | null
          response: Json | null
          status: string
          submission_uuid: string | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          document_type?: string
          environment?: string
          error_message?: string | null
          id?: string
          internal_id?: string | null
          invoice_id?: string | null
          long_id?: string | null
          payload?: Json | null
          rejected_at?: string | null
          response?: Json | null
          status?: string
          submission_uuid?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          document_type?: string
          environment?: string
          error_message?: string | null
          id?: string
          internal_id?: string | null
          invoice_id?: string | null
          long_id?: string | null
          payload?: Json | null
          rejected_at?: string | null
          response?: Json | null
          status?: string
          submission_uuid?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eta_submissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_submissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_customer_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: Database["public"]["Enums"]["finance_currency"]
          buy_rate: number | null
          created_at: string
          id: string
          mid_rate: number
          quote_currency: Database["public"]["Enums"]["finance_currency"]
          rate_date: string
          sell_rate: number | null
          source: string | null
        }
        Insert: {
          base_currency: Database["public"]["Enums"]["finance_currency"]
          buy_rate?: number | null
          created_at?: string
          id?: string
          mid_rate: number
          quote_currency: Database["public"]["Enums"]["finance_currency"]
          rate_date: string
          sell_rate?: number | null
          source?: string | null
        }
        Update: {
          base_currency?: Database["public"]["Enums"]["finance_currency"]
          buy_rate?: number | null
          created_at?: string
          id?: string
          mid_rate?: number
          quote_currency?: Database["public"]["Enums"]["finance_currency"]
          rate_date?: string
          sell_rate?: number | null
          source?: string | null
        }
        Relationships: []
      }
      finance_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      finance_stations: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          name: string
          name_ar: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          name_ar?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          name_ar?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_stations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depr_account_code: string | null
          accumulated_depreciation: number
          asset_account_code: string | null
          asset_code: string
          asset_name: string
          category: string | null
          company_id: string | null
          cost_center: string | null
          created_at: string
          currency: string
          depreciation_account_code: string | null
          depreciation_method: string
          disposal_amount: number | null
          disposal_date: string | null
          id: string
          in_service_date: string | null
          notes: string | null
          purchase_cost: number
          purchase_date: string
          salvage_value: number
          station_id: string | null
          status: string
          updated_at: string
          useful_life_months: number
        }
        Insert: {
          accumulated_depr_account_code?: string | null
          accumulated_depreciation?: number
          asset_account_code?: string | null
          asset_code: string
          asset_name: string
          category?: string | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          currency?: string
          depreciation_account_code?: string | null
          depreciation_method?: string
          disposal_amount?: number | null
          disposal_date?: string | null
          id?: string
          in_service_date?: string | null
          notes?: string | null
          purchase_cost?: number
          purchase_date: string
          salvage_value?: number
          station_id?: string | null
          status?: string
          updated_at?: string
          useful_life_months?: number
        }
        Update: {
          accumulated_depr_account_code?: string | null
          accumulated_depreciation?: number
          asset_account_code?: string | null
          asset_code?: string
          asset_name?: string
          category?: string | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          currency?: string
          depreciation_account_code?: string | null
          depreciation_method?: string
          disposal_amount?: number | null
          disposal_date?: string | null
          id?: string
          in_service_date?: string | null
          notes?: string | null
          purchase_cost?: number
          purchase_date?: string
          salvage_value?: number
          station_id?: string | null
          status?: string
          updated_at?: string
          useful_life_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_schedules: {
        Row: {
          aircraft_type: string
          airline_id: string | null
          arrival_date: string | null
          arrival_flight: string | null
          authority: string
          cargo_kg: number
          clearance_type: string
          config: number | null
          created_at: string
          created_via: string | null
          departure_date: string | null
          departure_flight: string | null
          flight_no: string
          handling: string | null
          handling_agent: string
          id: string
          no_of_flights: number | null
          notes: string | null
          passengers: number
          period_from: string | null
          period_to: string | null
          permit_no: string
          purpose: string
          ref_no: string | null
          registration: string
          remarks: string
          requested_date: string | null
          route: string
          royalty: boolean | null
          skd_type: string | null
          sta: string | null
          status: Database["public"]["Enums"]["clearance_status"]
          std: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          week_days: string | null
        }
        Insert: {
          aircraft_type?: string
          airline_id?: string | null
          arrival_date?: string | null
          arrival_flight?: string | null
          authority?: string
          cargo_kg?: number
          clearance_type?: string
          config?: number | null
          created_at?: string
          created_via?: string | null
          departure_date?: string | null
          departure_flight?: string | null
          flight_no?: string
          handling?: string | null
          handling_agent?: string
          id?: string
          no_of_flights?: number | null
          notes?: string | null
          passengers?: number
          period_from?: string | null
          period_to?: string | null
          permit_no?: string
          purpose?: string
          ref_no?: string | null
          registration?: string
          remarks?: string
          requested_date?: string | null
          route?: string
          royalty?: boolean | null
          skd_type?: string | null
          sta?: string | null
          status?: Database["public"]["Enums"]["clearance_status"]
          std?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          week_days?: string | null
        }
        Update: {
          aircraft_type?: string
          airline_id?: string | null
          arrival_date?: string | null
          arrival_flight?: string | null
          authority?: string
          cargo_kg?: number
          clearance_type?: string
          config?: number | null
          created_at?: string
          created_via?: string | null
          departure_date?: string | null
          departure_flight?: string | null
          flight_no?: string
          handling?: string | null
          handling_agent?: string
          id?: string
          no_of_flights?: number | null
          notes?: string | null
          passengers?: number
          period_from?: string | null
          period_to?: string | null
          permit_no?: string
          purpose?: string
          ref_no?: string | null
          registration?: string
          remarks?: string
          requested_date?: string | null
          route?: string
          royalty?: boolean | null
          skd_type?: string | null
          sta?: string | null
          status?: Database["public"]["Enums"]["clearance_status"]
          std?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          week_days?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_schedules_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_realized_entries: {
        Row: {
          base_currency: string
          booked_rate: number
          counterparty: string | null
          created_at: string
          created_by: string | null
          currency: string
          entry_date: string
          entry_no: string
          gain_loss: number
          id: string
          notes: string | null
          original_amount: number
          settlement_rate: number
          source_id: string | null
          source_no: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          booked_rate?: number
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          entry_date?: string
          entry_no: string
          gain_loss?: number
          id?: string
          notes?: string | null
          original_amount?: number
          settlement_rate?: number
          source_id?: string | null
          source_no?: string | null
          source_type: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          booked_rate?: number
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          entry_no?: string
          gain_loss?: number
          id?: string
          notes?: string | null
          original_amount?: number
          settlement_rate?: number
          source_id?: string | null
          source_no?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      fx_revaluation_lines: {
        Row: {
          booked_base: number
          booked_rate: number
          counterparty: string | null
          created_at: string
          currency: string
          current_base: number
          current_rate: number
          document_id: string | null
          document_no: string | null
          document_type: string
          gain_loss: number
          id: string
          original_amount: number
          run_id: string
        }
        Insert: {
          booked_base?: number
          booked_rate?: number
          counterparty?: string | null
          created_at?: string
          currency: string
          current_base?: number
          current_rate?: number
          document_id?: string | null
          document_no?: string | null
          document_type: string
          gain_loss?: number
          id?: string
          original_amount?: number
          run_id: string
        }
        Update: {
          booked_base?: number
          booked_rate?: number
          counterparty?: string | null
          created_at?: string
          currency?: string
          current_base?: number
          current_rate?: number
          document_id?: string | null
          document_no?: string | null
          document_type?: string
          gain_loss?: number
          id?: string
          original_amount?: number
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fx_revaluation_lines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "fx_revaluation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_revaluation_runs: {
        Row: {
          as_of_date: string
          base_currency: string
          created_at: string
          documents_evaluated: number
          id: string
          mode: string
          net_impact: number
          notes: string | null
          run_by: string | null
          run_no: string
          status: string
          total_gain: number
          total_loss: number
          updated_at: string
        }
        Insert: {
          as_of_date?: string
          base_currency?: string
          created_at?: string
          documents_evaluated?: number
          id?: string
          mode?: string
          net_impact?: number
          notes?: string | null
          run_by?: string | null
          run_no: string
          status?: string
          total_gain?: number
          total_loss?: number
          updated_at?: string
        }
        Update: {
          as_of_date?: string
          base_currency?: string
          created_at?: string
          documents_evaluated?: number
          id?: string
          mode?: string
          net_impact?: number
          notes?: string | null
          run_by?: string | null
          run_no?: string
          status?: string
          total_gain?: number
          total_loss?: number
          updated_at?: string
        }
        Relationships: []
      }
      hall_vvip: {
        Row: {
          created_at: string
          id: string
          price: string
          service: string
          terminal: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: string
          service?: string
          terminal?: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: string
          service?: string
          terminal?: string
          unit?: string
        }
        Relationships: []
      }
      intercompany_transactions: {
        Row: {
          amount: number
          base_amount: number | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          exchange_rate: number
          from_company_id: string
          from_journal_id: string | null
          from_station_id: string | null
          ic_no: string
          id: string
          notes: string | null
          reconciled_at: string | null
          status: string
          to_company_id: string
          to_journal_id: string | null
          to_station_id: string | null
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          base_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          exchange_rate?: number
          from_company_id: string
          from_journal_id?: string | null
          from_station_id?: string | null
          ic_no: string
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          status?: string
          to_company_id: string
          to_journal_id?: string | null
          to_station_id?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          base_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          exchange_rate?: number
          from_company_id?: string
          from_journal_id?: string | null
          from_station_id?: string | null
          ic_no?: string
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          status?: string
          to_company_id?: string
          to_journal_id?: string | null
          to_station_id?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercompany_transactions_from_company_id_fkey"
            columns: ["from_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_transactions_from_journal_id_fkey"
            columns: ["from_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_transactions_from_station_id_fkey"
            columns: ["from_station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_transactions_to_company_id_fkey"
            columns: ["to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_transactions_to_journal_id_fkey"
            columns: ["to_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_transactions_to_station_id_fkey"
            columns: ["to_station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_variance_reports: {
        Row: {
          created_at: string
          created_by: string | null
          details: Json
          draft_invoice_id: string | null
          flight_schedule_id: string | null
          id: string
          resolution: string | null
          severity: string
          supplier_id: string | null
          updated_at: string
          variance_amount: number
          variance_pct: number
          vendor_invoice_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          details?: Json
          draft_invoice_id?: string | null
          flight_schedule_id?: string | null
          id?: string
          resolution?: string | null
          severity?: string
          supplier_id?: string | null
          updated_at?: string
          variance_amount?: number
          variance_pct?: number
          vendor_invoice_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          details?: Json
          draft_invoice_id?: string | null
          flight_schedule_id?: string | null
          id?: string
          resolution?: string | null
          severity?: string
          supplier_id?: string | null
          updated_at?: string
          variance_amount?: number
          variance_pct?: number
          vendor_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_variance_reports_draft_invoice_id_fkey"
            columns: ["draft_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_variance_reports_draft_invoice_id_fkey"
            columns: ["draft_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_variance_reports_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_variance_reports_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          airline_iata: string | null
          airport_charges: number
          base_currency: Database["public"]["Enums"]["finance_currency"] | null
          base_total: number | null
          billing_period: string
          catering: number
          civil_aviation: number
          company_id: string | null
          created_at: string
          credit_note_ref: string
          currency: Database["public"]["Enums"]["currency_type"]
          date: string
          description: string | null
          draft_status: string
          due_date: string
          exchange_rate: number | null
          exchange_rate_date: string | null
          finalized_at: string | null
          finalized_by: string | null
          flight_ref: string | null
          flight_schedule_id: string | null
          handling: number
          id: string
          invoice_direction: Database["public"]["Enums"]["invoice_direction"]
          invoice_no: string
          invoice_type: string
          journal_entry_id: string | null
          notes: string | null
          operator: string
          other: number
          payment_date: string | null
          payment_ref: string
          sent_at: string | null
          sent_to: string | null
          service_report_id: string | null
          service_type: string | null
          source: string
          station: string
          station_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          supplier_id: string | null
          total: number
          transaction_currency:
            | Database["public"]["Enums"]["finance_currency"]
            | null
          updated_at: string
          vat: number
        }
        Insert: {
          airline_iata?: string | null
          airport_charges?: number
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          base_total?: number | null
          billing_period?: string
          catering?: number
          civil_aviation?: number
          company_id?: string | null
          created_at?: string
          credit_note_ref?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          description?: string | null
          draft_status?: string
          due_date?: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          flight_ref?: string | null
          flight_schedule_id?: string | null
          handling?: number
          id?: string
          invoice_direction?: Database["public"]["Enums"]["invoice_direction"]
          invoice_no: string
          invoice_type?: string
          journal_entry_id?: string | null
          notes?: string | null
          operator: string
          other?: number
          payment_date?: string | null
          payment_ref?: string
          sent_at?: string | null
          sent_to?: string | null
          service_report_id?: string | null
          service_type?: string | null
          source?: string
          station?: string
          station_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          supplier_id?: string | null
          total?: number
          transaction_currency?:
            | Database["public"]["Enums"]["finance_currency"]
            | null
          updated_at?: string
          vat?: number
        }
        Update: {
          airline_iata?: string | null
          airport_charges?: number
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          base_total?: number | null
          billing_period?: string
          catering?: number
          civil_aviation?: number
          company_id?: string | null
          created_at?: string
          credit_note_ref?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          description?: string | null
          draft_status?: string
          due_date?: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          flight_ref?: string | null
          flight_schedule_id?: string | null
          handling?: number
          id?: string
          invoice_direction?: Database["public"]["Enums"]["invoice_direction"]
          invoice_no?: string
          invoice_type?: string
          journal_entry_id?: string | null
          notes?: string | null
          operator?: string
          other?: number
          payment_date?: string | null
          payment_ref?: string
          sent_at?: string | null
          sent_to?: string | null
          service_report_id?: string | null
          service_type?: string | null
          source?: string
          station?: string
          station_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          supplier_id?: string | null
          total?: number
          transaction_currency?:
            | Database["public"]["Enums"]["finance_currency"]
            | null
          updated_at?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      irregularity_reports: {
        Row: {
          airline: string
          assigned_to: string
          category: string
          created_at: string
          description: string
          flight_no: string
          id: string
          incident_date: string
          report_id: string
          reported_by: string
          resolution: string
          resolved_at: string | null
          severity: string
          station: string
          status: string
          updated_at: string
        }
        Insert: {
          airline?: string
          assigned_to?: string
          category?: string
          created_at?: string
          description?: string
          flight_no?: string
          id?: string
          incident_date?: string
          report_id?: string
          reported_by?: string
          resolution?: string
          resolved_at?: string | null
          severity?: string
          station?: string
          status?: string
          updated_at?: string
        }
        Update: {
          airline?: string
          assigned_to?: string
          category?: string
          created_at?: string
          description?: string
          flight_no?: string
          id?: string
          incident_date?: string
          report_id?: string
          reported_by?: string
          resolution?: string
          resolved_at?: string | null
          severity?: string
          station?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          base_currency: Database["public"]["Enums"]["finance_currency"] | null
          company_id: string | null
          created_at: string
          created_by: string
          description: string
          entry_date: string
          entry_no: string
          id: string
          posted_at: string | null
          reference: string
          reference_id: string | null
          reference_type: string
          status: Database["public"]["Enums"]["journal_status"]
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          entry_no: string
          id?: string
          posted_at?: string | null
          reference?: string
          reference_id?: string | null
          reference_type?: string
          status?: Database["public"]["Enums"]["journal_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          entry_no?: string
          id?: string
          posted_at?: string | null
          reference?: string
          reference_id?: string | null
          reference_type?: string
          status?: Database["public"]["Enums"]["journal_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          airline_id: string | null
          base_amount: number | null
          base_currency: Database["public"]["Enums"]["finance_currency"] | null
          company_id: string | null
          credit: number
          debit: number
          description: string
          entry_id: string
          exchange_rate: number
          exchange_rate_date: string | null
          flight_schedule_id: string | null
          id: string
          service_type: string | null
          sort_order: number
          station_id: string | null
          supplier_id: string | null
          transaction_amount: number | null
          transaction_currency:
            | Database["public"]["Enums"]["finance_currency"]
            | null
        }
        Insert: {
          account_id: string
          airline_id?: string | null
          base_amount?: number | null
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          company_id?: string | null
          credit?: number
          debit?: number
          description?: string
          entry_id: string
          exchange_rate?: number
          exchange_rate_date?: string | null
          flight_schedule_id?: string | null
          id?: string
          service_type?: string | null
          sort_order?: number
          station_id?: string | null
          supplier_id?: string | null
          transaction_amount?: number | null
          transaction_currency?:
            | Database["public"]["Enums"]["finance_currency"]
            | null
        }
        Update: {
          account_id?: string
          airline_id?: string | null
          base_amount?: number | null
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          company_id?: string | null
          credit?: number
          debit?: number
          description?: string
          entry_id?: string
          exchange_rate?: number
          exchange_rate_date?: string | null
          flight_schedule_id?: string | null
          id?: string
          service_type?: string | null
          sort_order?: number
          station_id?: string | null
          supplier_id?: string | null
          transaction_amount?: number | null
          transaction_currency?:
            | Database["public"]["Enums"]["finance_currency"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found: {
        Row: {
          airline: string
          brand: string | null
          category: string
          claim_date: string | null
          color: string | null
          created_at: string
          description: string
          flight_no: string
          found_by: string
          id: string
          item_id: string
          notes: string | null
          owner_contact: string | null
          owner_name: string | null
          report_date: string
          station: string
          status: Database["public"]["Enums"]["lost_found_status"]
          storage_location: string | null
          terminal: string
          updated_at: string
          weight: string
        }
        Insert: {
          airline?: string
          brand?: string | null
          category?: string
          claim_date?: string | null
          color?: string | null
          created_at?: string
          description?: string
          flight_no?: string
          found_by?: string
          id?: string
          item_id?: string
          notes?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          report_date?: string
          station?: string
          status?: Database["public"]["Enums"]["lost_found_status"]
          storage_location?: string | null
          terminal?: string
          updated_at?: string
          weight?: string
        }
        Update: {
          airline?: string
          brand?: string | null
          category?: string
          claim_date?: string | null
          color?: string | null
          created_at?: string
          description?: string
          flight_no?: string
          found_by?: string
          id?: string
          item_id?: string
          notes?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          report_date?: string
          station?: string
          status?: Database["public"]["Enums"]["lost_found_status"]
          storage_location?: string | null
          terminal?: string
          updated_at?: string
          weight?: string
        }
        Relationships: []
      }
      manuals_forms: {
        Row: {
          category: string
          created_at: string
          department: string
          doc_id: string
          id: string
          last_updated: string | null
          status: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          category?: string
          created_at?: string
          department?: string
          doc_id?: string
          id?: string
          last_updated?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string
          created_at?: string
          department?: string
          doc_id?: string
          id?: string
          last_updated?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      migration_audit_log: {
        Row: {
          action: string
          column_name: string | null
          entity_name: string
          id: string
          migrated_at: string
          migrated_by: string | null
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
        }
        Insert: {
          action: string
          column_name?: string | null
          entity_name: string
          id?: string
          migrated_at?: string
          migrated_by?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
        }
        Update: {
          action?: string
          column_name?: string | null
          entity_name?: string
          id?: string
          migrated_at?: string
          migrated_by?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
        }
        Relationships: []
      }
      minority_interests: {
        Row: {
          created_at: string
          id: string
          minority_interest_amount: number
          minority_pct: number
          notes: string | null
          ownership_pct: number
          run_id: string
          subsidiary_company_id: string
          subsidiary_equity: number
          subsidiary_net_income: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          minority_interest_amount?: number
          minority_pct?: number
          notes?: string | null
          ownership_pct?: number
          run_id: string
          subsidiary_company_id: string
          subsidiary_equity?: number
          subsidiary_net_income?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          minority_interest_amount?: number
          minority_pct?: number
          notes?: string | null
          ownership_pct?: number
          run_id?: string
          subsidiary_company_id?: string
          subsidiary_equity?: number
          subsidiary_net_income?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minority_interests_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "consolidation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minority_interests_subsidiary_company_id_fkey"
            columns: ["subsidiary_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_payable: {
        Row: {
          amount: number
          bank_account_id: string
          cheque_date: string
          cheque_no: string
          clearance_date: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["finance_currency"]
          id: string
          matched_invoices: Json
          notes: string | null
          payment_type: string
          posted_at: string | null
          posted_by: string | null
          reconciliation_memo: string | null
          status: Database["public"]["Enums"]["cheque_status"]
          supplier_category: string
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          cheque_date: string
          cheque_no: string
          clearance_date?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["finance_currency"]
          id?: string
          matched_invoices?: Json
          notes?: string | null
          payment_type: string
          posted_at?: string | null
          posted_by?: string | null
          reconciliation_memo?: string | null
          status?: Database["public"]["Enums"]["cheque_status"]
          supplier_category: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          cheque_date?: string
          cheque_no?: string
          clearance_date?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["finance_currency"]
          id?: string
          matched_invoices?: Json
          notes?: string | null
          payment_type?: string
          posted_at?: string | null
          posted_by?: string | null
          reconciliation_memo?: string | null
          status?: Database["public"]["Enums"]["cheque_status"]
          supplier_category?: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_payable_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_payable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          contract_alerts: boolean
          created_at: string
          email_enabled: boolean
          flight_alerts: boolean
          id: string
          invoice_alerts: boolean
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          staff_alerts: boolean
          system_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_alerts?: boolean
          created_at?: string
          email_enabled?: boolean
          flight_alerts?: boolean
          id?: string
          invoice_alerts?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          staff_alerts?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_alerts?: boolean
          created_at?: string
          email_enabled?: boolean
          flight_alerts?: boolean
          id?: string
          invoice_alerts?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          staff_alerts?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      objection_letters: {
        Row: {
          audit_trail: Json
          closed_at: string | null
          closed_by: string | null
          contracted_price: number
          created_at: string
          currency: Database["public"]["Enums"]["finance_currency"]
          difference: number | null
          disputed_service: string
          flight_date: string | null
          flight_ref: string | null
          id: string
          invoiced_price: number
          letter_no: string
          notes: string | null
          opened_by: string | null
          payment_frozen: boolean
          settled_amount: number | null
          status: Database["public"]["Enums"]["objection_status"]
          supplier_id: string | null
          updated_at: string
          variance_report_id: string | null
        }
        Insert: {
          audit_trail?: Json
          closed_at?: string | null
          closed_by?: string | null
          contracted_price?: number
          created_at?: string
          currency: Database["public"]["Enums"]["finance_currency"]
          difference?: number | null
          disputed_service?: string
          flight_date?: string | null
          flight_ref?: string | null
          id?: string
          invoiced_price?: number
          letter_no: string
          notes?: string | null
          opened_by?: string | null
          payment_frozen?: boolean
          settled_amount?: number | null
          status?: Database["public"]["Enums"]["objection_status"]
          supplier_id?: string | null
          updated_at?: string
          variance_report_id?: string | null
        }
        Update: {
          audit_trail?: Json
          closed_at?: string | null
          closed_by?: string | null
          contracted_price?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["finance_currency"]
          difference?: number | null
          disputed_service?: string
          flight_date?: string | null
          flight_ref?: string | null
          id?: string
          invoiced_price?: number
          letter_no?: string
          notes?: string | null
          opened_by?: string | null
          payment_frozen?: boolean
          settled_amount?: number | null
          status?: Database["public"]["Enums"]["objection_status"]
          supplier_id?: string | null
          updated_at?: string
          variance_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objection_letters_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objection_letters_variance_report_id_fkey"
            columns: ["variance_report_id"]
            isOneToOne: false
            referencedRelation: "invoice_variance_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      overfly_schedules: {
        Row: {
          aircraft_type: string | null
          altitude: string | null
          created_at: string
          currency: string
          distance_nm: number
          entry_point: string | null
          entry_time: string | null
          exit_point: string | null
          exit_time: string | null
          fee: number
          fir_zones: string
          flight_no: string
          id: string
          mtow: string | null
          operator: string
          overfly_date: string | null
          permit_no: string | null
          registration: string | null
          route_from: string
          route_to: string
          status: Database["public"]["Enums"]["overfly_status"]
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          aircraft_type?: string | null
          altitude?: string | null
          created_at?: string
          currency?: string
          distance_nm?: number
          entry_point?: string | null
          entry_time?: string | null
          exit_point?: string | null
          exit_time?: string | null
          fee?: number
          fir_zones?: string
          flight_no: string
          id?: string
          mtow?: string | null
          operator: string
          overfly_date?: string | null
          permit_no?: string | null
          registration?: string | null
          route_from?: string
          route_to?: string
          status?: Database["public"]["Enums"]["overfly_status"]
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          aircraft_type?: string | null
          altitude?: string | null
          created_at?: string
          currency?: string
          distance_nm?: number
          entry_point?: string | null
          entry_time?: string | null
          exit_point?: string | null
          exit_time?: string | null
          fee?: number
          fir_zones?: string
          flight_no?: string
          id?: string
          mtow?: string | null
          operator?: string
          overfly_date?: string | null
          permit_no?: string | null
          registration?: string | null
          route_from?: string
          route_to?: string
          status?: Database["public"]["Enums"]["overfly_status"]
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      payment_reminders: {
        Row: {
          airline_iata: string | null
          body: string | null
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string
          level: number
          method: string
          recipient_email: string | null
          sent_at: string
          sent_by: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          airline_iata?: string | null
          body?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id: string
          level: number
          method?: string
          recipient_email?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          airline_iata?: string | null
          body?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string
          level?: number
          method?: string
          recipient_email?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_customer_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          base_amount: number | null
          base_currency: string | null
          cash_account_id: string | null
          created_at: string
          currency: string
          exchange_rate: number | null
          exchange_rate_date: string | null
          id: string
          method: string
          notes: string | null
          payment_date: string
          payment_no: string
          reconciled_at: string | null
          reconciliation_id: string | null
          reference: string | null
          status: string
          updated_at: string
          vendor_invoice_id: string | null
          vendor_name: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          base_amount?: number | null
          base_currency?: string | null
          cash_account_id?: string | null
          created_at?: string
          currency?: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          payment_no: string
          reconciled_at?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          vendor_invoice_id?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          base_amount?: number | null
          base_currency?: string | null
          cash_account_id?: string | null
          created_at?: string
          currency?: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          payment_no?: string
          reconciled_at?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          vendor_invoice_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      period_close_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          performed_by: string | null
          period_id: string
          reason: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          period_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          period_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_close_audit_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      period_close_checklist_items: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_complete: boolean
          name: string
          notes: string | null
          period_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          name: string
          notes?: string | null
          period_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          name?: string
          notes?: string | null
          period_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_close_checklist_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string
          currency: string
          description: string
          entry_type: string
          expense_date: string
          fund_id: string
          gl_account_id: string | null
          id: string
          notes: string | null
          receipt_ref: string | null
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description: string
          entry_type?: string
          expense_date?: string
          fund_id: string
          gl_account_id?: string | null
          id?: string
          notes?: string | null
          receipt_ref?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string
          entry_type?: string
          expense_date?: string
          fund_id?: string
          gl_account_id?: string | null
          id?: string
          notes?: string | null
          receipt_ref?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_expenses_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_expenses_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_funds: {
        Row: {
          company_id: string | null
          created_at: string
          currency: string
          current_balance: number
          custodian_name: string
          float_limit: number
          fund_code: string
          id: string
          notes: string | null
          station: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          custodian_name: string
          float_limit?: number
          fund_code: string
          id?: string
          notes?: string | null
          station?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          custodian_name?: string
          float_limit?: number
          fund_code?: string
          id?: string
          notes?: string | null
          station?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_funds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          station: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          station?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          station?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number
          bank_account_id: string | null
          base_amount: number | null
          base_currency: string | null
          cash_account_id: string | null
          created_at: string
          currency: string
          customer_name: string
          exchange_rate: number | null
          exchange_rate_date: string | null
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          receipt_date: string
          receipt_no: string
          reconciled_at: string | null
          reconciliation_id: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          base_amount?: number | null
          base_currency?: string | null
          cash_account_id?: string | null
          created_at?: string
          currency?: string
          customer_name: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          receipt_date?: string
          receipt_no: string
          reconciled_at?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          base_amount?: number | null
          base_currency?: string | null
          cash_account_id?: string | null
          created_at?: string
          currency?: string
          customer_name?: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          receipt_date?: string
          receipt_no?: string
          reconciled_at?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoice_lines: {
        Row: {
          account_code: string | null
          amount: number | null
          created_at: string
          description: string
          id: string
          quantity: number
          sort_order: number
          template_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          account_code?: string | null
          amount?: number | null
          created_at?: string
          description: string
          id?: string
          quantity?: number
          sort_order?: number
          template_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          account_code?: string | null
          amount?: number | null
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          sort_order?: number
          template_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoice_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recurring_invoice_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoice_runs: {
        Row: {
          created_at: string
          currency: string | null
          details: Json | null
          id: string
          invoices_created: number
          mode: string
          run_by: string | null
          run_date: string
          run_no: string
          status: string
          templates_processed: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          details?: Json | null
          id?: string
          invoices_created?: number
          mode?: string
          run_by?: string | null
          run_date?: string
          run_no: string
          status?: string
          templates_processed?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          details?: Json | null
          id?: string
          invoices_created?: number
          mode?: string
          run_by?: string | null
          run_date?: string
          run_no?: string
          status?: string
          templates_processed?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      recurring_invoice_templates: {
        Row: {
          auto_post: boolean
          company_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          customer_name: string | null
          day_of_month: number | null
          end_date: string | null
          frequency: string
          id: string
          last_run_date: string | null
          name: string
          next_run_date: string
          notes: string | null
          start_date: string
          status: string
          template_no: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          auto_post?: boolean
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_name?: string | null
          day_of_month?: number | null
          end_date?: string | null
          frequency?: string
          id?: string
          last_run_date?: string | null
          name: string
          next_run_date?: string
          notes?: string | null
          start_date?: string
          status?: string
          template_no: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          auto_post?: boolean
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_name?: string | null
          day_of_month?: number | null
          end_date?: string | null
          frequency?: string
          id?: string
          last_run_date?: string | null
          name?: string
          next_run_date?: string
          notes?: string | null
          start_date?: string
          status?: string
          template_no?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoice_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_journal_entries: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          day_of_month: number
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          last_run_date: string | null
          name: string
          next_run_date: string
          reference_prefix: string | null
          run_count: number
          start_date: string
          station_id: string | null
          template_lines: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          day_of_month?: number
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          last_run_date?: string | null
          name: string
          next_run_date: string
          reference_prefix?: string | null
          run_count?: number
          start_date: string
          station_id?: string | null
          template_lines?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          day_of_month?: number
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          last_run_date?: string | null
          name?: string
          next_run_date?: string
          reference_prefix?: string | null
          run_count?: number
          start_date?: string
          station_id?: string | null
          template_lines?: Json
          updated_at?: string
        }
        Relationships: []
      }
      security_check_runs: {
        Row: {
          checks: Json
          created_at: string
          id: string
          passed: boolean
          source: string
        }
        Insert: {
          checks?: Json
          created_at?: string
          id?: string
          passed: boolean
          source?: string
        }
        Update: {
          checks?: Json
          created_at?: string
          id?: string
          passed?: boolean
          source?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          airport_id: string | null
          contact_person: string
          contract_ref: string
          country_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          service_category: Database["public"]["Enums"]["service_category"]
          status: string
          updated_at: string
        }
        Insert: {
          airport_id?: string | null
          contact_person?: string
          contract_ref?: string
          country_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string
          service_category?: Database["public"]["Enums"]["service_category"]
          status?: string
          updated_at?: string
        }
        Update: {
          airport_id?: string | null
          contact_person?: string
          contract_ref?: string
          country_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          service_category?: Database["public"]["Enums"]["service_category"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      service_report_catering: {
        Row: {
          catering_item: string
          created_at: string
          id: string
          price_per_unit: number
          quantity: number
          report_id: string
          sort_order: number
          supplier: string
          total: number
        }
        Insert: {
          catering_item?: string
          created_at?: string
          id?: string
          price_per_unit?: number
          quantity?: number
          report_id: string
          sort_order?: number
          supplier?: string
          total?: number
        }
        Update: {
          catering_item?: string
          created_at?: string
          id?: string
          price_per_unit?: number
          quantity?: number
          report_id?: string
          sort_order?: number
          supplier?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_report_catering_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["service_report_id"]
          },
          {
            foreignKeyName: "service_report_catering_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_report_catering_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["id"]
          },
        ]
      }
      service_report_delays: {
        Row: {
          code: string
          explanation: string
          id: string
          report_id: string
          sort_order: number
          timing: number
        }
        Insert: {
          code?: string
          explanation?: string
          id?: string
          report_id: string
          sort_order?: number
          timing?: number
        }
        Update: {
          code?: string
          explanation?: string
          id?: string
          report_id?: string
          sort_order?: number
          timing?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_report_delays_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["service_report_id"]
          },
          {
            foreignKeyName: "service_report_delays_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_report_delays_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["id"]
          },
        ]
      }
      service_report_fuel: {
        Row: {
          created_at: string
          fuel_type: string
          id: string
          price_per_unit: number
          quantity: number
          report_id: string
          sort_order: number
          supplier: string
          total: number
        }
        Insert: {
          created_at?: string
          fuel_type?: string
          id?: string
          price_per_unit?: number
          quantity?: number
          report_id: string
          sort_order?: number
          supplier?: string
          total?: number
        }
        Update: {
          created_at?: string
          fuel_type?: string
          id?: string
          price_per_unit?: number
          quantity?: number
          report_id?: string
          sort_order?: number
          supplier?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_report_fuel_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["service_report_id"]
          },
          {
            foreignKeyName: "service_report_fuel_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_report_fuel_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["id"]
          },
        ]
      }
      service_report_hotac: {
        Row: {
          created_at: string
          hotel_name: string
          id: string
          price_per_night: number
          quantity: number
          report_id: string
          room_classification: string
          sort_order: number
          total: number
          type_of_service: string
        }
        Insert: {
          created_at?: string
          hotel_name?: string
          id?: string
          price_per_night?: number
          quantity?: number
          report_id: string
          room_classification?: string
          sort_order?: number
          total?: number
          type_of_service?: string
        }
        Update: {
          created_at?: string
          hotel_name?: string
          id?: string
          price_per_night?: number
          quantity?: number
          report_id?: string
          room_classification?: string
          sort_order?: number
          total?: number
          type_of_service?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_report_hotac_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["service_report_id"]
          },
          {
            foreignKeyName: "service_report_hotac_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_report_hotac_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reports: {
        Row: {
          airport_charge: number
          arrival_date: string | null
          ata: string | null
          atd: string | null
          catering_charge: number
          check_in_system: string | null
          civil_aviation_fee: number
          co: string | null
          confirmation_no: string
          created_at: string
          crew_count: number
          currency: Database["public"]["Enums"]["currency_type"]
          day_night: string
          departure_date: string | null
          egyptian_pax_in: number
          egyptian_pax_out: number
          estimated_foreign_bill: number
          estimated_local_bill: number
          file_flt_plan_qty: number
          fire_cart_qty: number
          flight_schedule_id: string | null
          flight_status: string
          follow_me_qty: number
          foreign_pax_in: number
          foreign_pax_out: number
          fuel_charge: number
          ground_time: string | null
          handling_fee: number
          handling_type: Database["public"]["Enums"]["handling_type"]
          hotac_charge: number
          housing_charge: number
          housing_days: number
          id: string
          infant_in: number
          infant_out: number
          jetway_qty: number
          landing_charge: number
          met_folder_qty: number
          mtow: string
          ob: string | null
          operator: string
          parking_charge: number
          parking_day_hours: number
          parking_night_hours: number
          pax_in_adult_d: number
          pax_in_adult_i: number
          pax_in_inf_d: number
          pax_in_inf_i: number
          pax_transit: number
          performed_by: string | null
          print_ops_flt_plan_qty: number
          project_tags: string | null
          review_comment: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          sta: string | null
          std: string | null
          td: string | null
          to: string | null
          total_cost: number
          total_departing_pax: number
          total_parking_hours: number
          updated_at: string
        }
        Insert: {
          airport_charge?: number
          arrival_date?: string | null
          ata?: string | null
          atd?: string | null
          catering_charge?: number
          check_in_system?: string | null
          civil_aviation_fee?: number
          co?: string | null
          confirmation_no?: string
          created_at?: string
          crew_count?: number
          currency?: Database["public"]["Enums"]["currency_type"]
          day_night?: string
          departure_date?: string | null
          egyptian_pax_in?: number
          egyptian_pax_out?: number
          estimated_foreign_bill?: number
          estimated_local_bill?: number
          file_flt_plan_qty?: number
          fire_cart_qty?: number
          flight_schedule_id?: string | null
          flight_status?: string
          follow_me_qty?: number
          foreign_pax_in?: number
          foreign_pax_out?: number
          fuel_charge?: number
          ground_time?: string | null
          handling_fee?: number
          handling_type?: Database["public"]["Enums"]["handling_type"]
          hotac_charge?: number
          housing_charge?: number
          housing_days?: number
          id?: string
          infant_in?: number
          infant_out?: number
          jetway_qty?: number
          landing_charge?: number
          met_folder_qty?: number
          mtow?: string
          ob?: string | null
          operator: string
          parking_charge?: number
          parking_day_hours?: number
          parking_night_hours?: number
          pax_in_adult_d?: number
          pax_in_adult_i?: number
          pax_in_inf_d?: number
          pax_in_inf_i?: number
          pax_transit?: number
          performed_by?: string | null
          print_ops_flt_plan_qty?: number
          project_tags?: string | null
          review_comment?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sta?: string | null
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number
          total_departing_pax?: number
          total_parking_hours?: number
          updated_at?: string
        }
        Update: {
          airport_charge?: number
          arrival_date?: string | null
          ata?: string | null
          atd?: string | null
          catering_charge?: number
          check_in_system?: string | null
          civil_aviation_fee?: number
          co?: string | null
          confirmation_no?: string
          created_at?: string
          crew_count?: number
          currency?: Database["public"]["Enums"]["currency_type"]
          day_night?: string
          departure_date?: string | null
          egyptian_pax_in?: number
          egyptian_pax_out?: number
          estimated_foreign_bill?: number
          estimated_local_bill?: number
          file_flt_plan_qty?: number
          fire_cart_qty?: number
          flight_schedule_id?: string | null
          flight_status?: string
          follow_me_qty?: number
          foreign_pax_in?: number
          foreign_pax_out?: number
          fuel_charge?: number
          ground_time?: string | null
          handling_fee?: number
          handling_type?: Database["public"]["Enums"]["handling_type"]
          hotac_charge?: number
          housing_charge?: number
          housing_days?: number
          id?: string
          infant_in?: number
          infant_out?: number
          jetway_qty?: number
          landing_charge?: number
          met_folder_qty?: number
          mtow?: string
          ob?: string | null
          operator?: string
          parking_charge?: number
          parking_day_hours?: number
          parking_night_hours?: number
          pax_in_adult_d?: number
          pax_in_adult_i?: number
          pax_in_inf_d?: number
          pax_in_inf_i?: number
          pax_transit?: number
          performed_by?: string | null
          print_ops_flt_plan_qty?: number
          project_tags?: string | null
          review_comment?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sta?: string | null
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number
          total_departing_pax?: number
          total_parking_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reports_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "flight_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reports_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["flight_schedule_id"]
          },
          {
            foreignKeyName: "service_reports_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_dispatch_with_flight"
            referencedColumns: ["fs_id"]
          },
          {
            foreignKeyName: "service_reports_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["fs_id"]
          },
        ]
      }
      services_catalog: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          description: string
          id: string
          name: string
          related_documents: string
          related_reports: string
          report_template: string
          status: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string
          id?: string
          name: string
          related_documents?: string
          related_reports?: string
          report_template?: string
          status?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string
          id?: string
          name?: string
          related_documents?: string
          related_reports?: string
          report_template?: string
          status?: string
        }
        Relationships: []
      }
      short_term_loans: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["finance_currency"]
          deduction_plan: string
          employee_id: string | null
          employee_name: string
          id: string
          installments: number
          installments_paid: number
          loan_no: string
          notes: string | null
          rejection_reason: string | null
          request_date: string
          requested_by: string | null
          source_bank_id: string | null
          source_cash_id: string | null
          source_type: string
          station_id: string | null
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
          voucher_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["finance_currency"]
          deduction_plan: string
          employee_id?: string | null
          employee_name: string
          id?: string
          installments?: number
          installments_paid?: number
          loan_no: string
          notes?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_by?: string | null
          source_bank_id?: string | null
          source_cash_id?: string | null
          source_type: string
          station_id?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["finance_currency"]
          deduction_plan?: string
          employee_id?: string | null
          employee_name?: string
          id?: string
          installments?: number
          installments_paid?: number
          loan_no?: string
          notes?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_by?: string | null
          source_bank_id?: string | null
          source_cash_id?: string | null
          source_type?: string
          station_id?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_term_loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_term_loans_source_bank_id_fkey"
            columns: ["source_bank_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_term_loans_source_cash_id_fkey"
            columns: ["source_cash_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_term_loans_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_term_loans_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "treasury_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshot_dispatch_assignments_pre_phase3: {
        Row: {
          actual_duration_hours: number | null
          actual_end: string | null
          actual_start: string | null
          airline: string | null
          base_fee: number | null
          charges_breakdown: Json | null
          charges_currency: string | null
          contract_duration_hours: number | null
          contract_id: string | null
          created_at: string | null
          created_via: string | null
          dispatched_by: string | null
          extra_manpower_count: number | null
          flight_date: string | null
          flight_no: string | null
          flight_schedule_id: string | null
          id: string | null
          irregularity_id: string | null
          notes: string | null
          overtime_charge: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          ramp_vehicle_trips: number | null
          return_to_ramp_with_load: boolean | null
          review_comment: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          service_rate: number | null
          service_type: string | null
          short_notice: boolean | null
          staff_count: number | null
          staff_names: string | null
          station: string | null
          status: string | null
          task_sheet_data: Json | null
          total_charge: number | null
          total_security_charges: number | null
          updated_at: string | null
        }
        Insert: {
          actual_duration_hours?: number | null
          actual_end?: string | null
          actual_start?: string | null
          airline?: string | null
          base_fee?: number | null
          charges_breakdown?: Json | null
          charges_currency?: string | null
          contract_duration_hours?: number | null
          contract_id?: string | null
          created_at?: string | null
          created_via?: string | null
          dispatched_by?: string | null
          extra_manpower_count?: number | null
          flight_date?: string | null
          flight_no?: string | null
          flight_schedule_id?: string | null
          id?: string | null
          irregularity_id?: string | null
          notes?: string | null
          overtime_charge?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          ramp_vehicle_trips?: number | null
          return_to_ramp_with_load?: boolean | null
          review_comment?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_rate?: number | null
          service_type?: string | null
          short_notice?: boolean | null
          staff_count?: number | null
          staff_names?: string | null
          station?: string | null
          status?: string | null
          task_sheet_data?: Json | null
          total_charge?: number | null
          total_security_charges?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_duration_hours?: number | null
          actual_end?: string | null
          actual_start?: string | null
          airline?: string | null
          base_fee?: number | null
          charges_breakdown?: Json | null
          charges_currency?: string | null
          contract_duration_hours?: number | null
          contract_id?: string | null
          created_at?: string | null
          created_via?: string | null
          dispatched_by?: string | null
          extra_manpower_count?: number | null
          flight_date?: string | null
          flight_no?: string | null
          flight_schedule_id?: string | null
          id?: string | null
          irregularity_id?: string | null
          notes?: string | null
          overtime_charge?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          ramp_vehicle_trips?: number | null
          return_to_ramp_with_load?: boolean | null
          review_comment?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_rate?: number | null
          service_type?: string | null
          short_notice?: boolean | null
          staff_count?: number | null
          staff_names?: string | null
          station?: string | null
          status?: string | null
          task_sheet_data?: Json | null
          total_charge?: number | null
          total_security_charges?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      snapshot_dispatch_assignments_pre_phase3b_step1: {
        Row: {
          actual_duration_hours: number | null
          actual_end: string | null
          actual_start: string | null
          airline: string | null
          base_fee: number | null
          charges_breakdown: Json | null
          charges_currency: string | null
          contract_duration_hours: number | null
          contract_id: string | null
          created_at: string | null
          created_via: string | null
          dispatched_by: string | null
          extra_manpower_count: number | null
          flight_date: string | null
          flight_no: string | null
          flight_schedule_id: string | null
          id: string | null
          irregularity_id: string | null
          notes: string | null
          overtime_charge: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          ramp_vehicle_trips: number | null
          return_to_ramp_with_load: boolean | null
          review_comment: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          service_rate: number | null
          service_type: string | null
          short_notice: boolean | null
          staff_count: number | null
          staff_names: string | null
          station: string | null
          status: string | null
          task_sheet_data: Json | null
          total_charge: number | null
          total_security_charges: number | null
          updated_at: string | null
        }
        Insert: {
          actual_duration_hours?: number | null
          actual_end?: string | null
          actual_start?: string | null
          airline?: string | null
          base_fee?: number | null
          charges_breakdown?: Json | null
          charges_currency?: string | null
          contract_duration_hours?: number | null
          contract_id?: string | null
          created_at?: string | null
          created_via?: string | null
          dispatched_by?: string | null
          extra_manpower_count?: number | null
          flight_date?: string | null
          flight_no?: string | null
          flight_schedule_id?: string | null
          id?: string | null
          irregularity_id?: string | null
          notes?: string | null
          overtime_charge?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          ramp_vehicle_trips?: number | null
          return_to_ramp_with_load?: boolean | null
          review_comment?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_rate?: number | null
          service_type?: string | null
          short_notice?: boolean | null
          staff_count?: number | null
          staff_names?: string | null
          station?: string | null
          status?: string | null
          task_sheet_data?: Json | null
          total_charge?: number | null
          total_security_charges?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_duration_hours?: number | null
          actual_end?: string | null
          actual_start?: string | null
          airline?: string | null
          base_fee?: number | null
          charges_breakdown?: Json | null
          charges_currency?: string | null
          contract_duration_hours?: number | null
          contract_id?: string | null
          created_at?: string | null
          created_via?: string | null
          dispatched_by?: string | null
          extra_manpower_count?: number | null
          flight_date?: string | null
          flight_no?: string | null
          flight_schedule_id?: string | null
          id?: string | null
          irregularity_id?: string | null
          notes?: string | null
          overtime_charge?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          ramp_vehicle_trips?: number | null
          return_to_ramp_with_load?: boolean | null
          review_comment?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_rate?: number | null
          service_type?: string | null
          short_notice?: boolean | null
          staff_count?: number | null
          staff_names?: string | null
          station?: string | null
          status?: string | null
          task_sheet_data?: Json | null
          total_charge?: number | null
          total_security_charges?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      snapshot_flight_schedules_pre_phase3: {
        Row: {
          aircraft_type: string | null
          airline_id: string | null
          arrival_date: string | null
          arrival_flight: string | null
          authority: string | null
          cargo_kg: number | null
          clearance_type: string | null
          config: number | null
          created_at: string | null
          created_via: string | null
          departure_date: string | null
          departure_flight: string | null
          flight_no: string | null
          handling: string | null
          handling_agent: string | null
          id: string | null
          no_of_flights: number | null
          notes: string | null
          passengers: number | null
          period_from: string | null
          period_to: string | null
          permit_no: string | null
          purpose: string | null
          ref_no: string | null
          registration: string | null
          remarks: string | null
          requested_date: string | null
          route: string | null
          royalty: boolean | null
          skd_type: string | null
          sta: string | null
          status: Database["public"]["Enums"]["clearance_status"] | null
          std: string | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
          week_days: string | null
        }
        Insert: {
          aircraft_type?: string | null
          airline_id?: string | null
          arrival_date?: string | null
          arrival_flight?: string | null
          authority?: string | null
          cargo_kg?: number | null
          clearance_type?: string | null
          config?: number | null
          created_at?: string | null
          created_via?: string | null
          departure_date?: string | null
          departure_flight?: string | null
          flight_no?: string | null
          handling?: string | null
          handling_agent?: string | null
          id?: string | null
          no_of_flights?: number | null
          notes?: string | null
          passengers?: number | null
          period_from?: string | null
          period_to?: string | null
          permit_no?: string | null
          purpose?: string | null
          ref_no?: string | null
          registration?: string | null
          remarks?: string | null
          requested_date?: string | null
          route?: string | null
          royalty?: boolean | null
          skd_type?: string | null
          sta?: string | null
          status?: Database["public"]["Enums"]["clearance_status"] | null
          std?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          week_days?: string | null
        }
        Update: {
          aircraft_type?: string | null
          airline_id?: string | null
          arrival_date?: string | null
          arrival_flight?: string | null
          authority?: string | null
          cargo_kg?: number | null
          clearance_type?: string | null
          config?: number | null
          created_at?: string | null
          created_via?: string | null
          departure_date?: string | null
          departure_flight?: string | null
          flight_no?: string | null
          handling?: string | null
          handling_agent?: string | null
          id?: string | null
          no_of_flights?: number | null
          notes?: string | null
          passengers?: number | null
          period_from?: string | null
          period_to?: string | null
          permit_no?: string | null
          purpose?: string | null
          ref_no?: string | null
          registration?: string | null
          remarks?: string | null
          requested_date?: string | null
          route?: string | null
          royalty?: boolean | null
          skd_type?: string | null
          sta?: string | null
          status?: Database["public"]["Enums"]["clearance_status"] | null
          std?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          week_days?: string | null
        }
        Relationships: []
      }
      snapshot_service_reports_pre_phase3: {
        Row: {
          aircraft_type: string | null
          airport_charge: number | null
          arrival_date: string | null
          ata: string | null
          atd: string | null
          catering_charge: number | null
          check_in_system: string | null
          civil_aviation_fee: number | null
          co: string | null
          confirmation_no: string | null
          created_at: string | null
          crew_count: number | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          day_night: string | null
          departure_date: string | null
          egyptian_pax_in: number | null
          egyptian_pax_out: number | null
          estimated_foreign_bill: number | null
          estimated_local_bill: number | null
          file_flt_plan_qty: number | null
          fire_cart_qty: number | null
          flight_no: string | null
          flight_schedule_id: string | null
          flight_status: string | null
          follow_me_qty: number | null
          foreign_pax_in: number | null
          foreign_pax_out: number | null
          fuel_charge: number | null
          ground_time: string | null
          handling_fee: number | null
          handling_type: Database["public"]["Enums"]["handling_type"] | null
          hotac_charge: number | null
          housing_charge: number | null
          housing_days: number | null
          id: string | null
          infant_in: number | null
          infant_out: number | null
          jetway_qty: number | null
          landing_charge: number | null
          met_folder_qty: number | null
          mtow: string | null
          ob: string | null
          operator: string | null
          parking_charge: number | null
          parking_day_hours: number | null
          parking_night_hours: number | null
          pax_in_adult_d: number | null
          pax_in_adult_i: number | null
          pax_in_inf_d: number | null
          pax_in_inf_i: number | null
          pax_transit: number | null
          performed_by: string | null
          print_ops_flt_plan_qty: number | null
          project_tags: string | null
          registration: string | null
          review_comment: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          route: string | null
          sta: string | null
          station: string | null
          std: string | null
          td: string | null
          to: string | null
          total_cost: number | null
          total_departing_pax: number | null
          total_parking_hours: number | null
          updated_at: string | null
        }
        Insert: {
          aircraft_type?: string | null
          airport_charge?: number | null
          arrival_date?: string | null
          ata?: string | null
          atd?: string | null
          catering_charge?: number | null
          check_in_system?: string | null
          civil_aviation_fee?: number | null
          co?: string | null
          confirmation_no?: string | null
          created_at?: string | null
          crew_count?: number | null
          currency?: Database["public"]["Enums"]["currency_type"] | null
          day_night?: string | null
          departure_date?: string | null
          egyptian_pax_in?: number | null
          egyptian_pax_out?: number | null
          estimated_foreign_bill?: number | null
          estimated_local_bill?: number | null
          file_flt_plan_qty?: number | null
          fire_cart_qty?: number | null
          flight_no?: string | null
          flight_schedule_id?: string | null
          flight_status?: string | null
          follow_me_qty?: number | null
          foreign_pax_in?: number | null
          foreign_pax_out?: number | null
          fuel_charge?: number | null
          ground_time?: string | null
          handling_fee?: number | null
          handling_type?: Database["public"]["Enums"]["handling_type"] | null
          hotac_charge?: number | null
          housing_charge?: number | null
          housing_days?: number | null
          id?: string | null
          infant_in?: number | null
          infant_out?: number | null
          jetway_qty?: number | null
          landing_charge?: number | null
          met_folder_qty?: number | null
          mtow?: string | null
          ob?: string | null
          operator?: string | null
          parking_charge?: number | null
          parking_day_hours?: number | null
          parking_night_hours?: number | null
          pax_in_adult_d?: number | null
          pax_in_adult_i?: number | null
          pax_in_inf_d?: number | null
          pax_in_inf_i?: number | null
          pax_transit?: number | null
          performed_by?: string | null
          print_ops_flt_plan_qty?: number | null
          project_tags?: string | null
          registration?: string | null
          review_comment?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string | null
          sta?: string | null
          station?: string | null
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number | null
          total_departing_pax?: number | null
          total_parking_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          aircraft_type?: string | null
          airport_charge?: number | null
          arrival_date?: string | null
          ata?: string | null
          atd?: string | null
          catering_charge?: number | null
          check_in_system?: string | null
          civil_aviation_fee?: number | null
          co?: string | null
          confirmation_no?: string | null
          created_at?: string | null
          crew_count?: number | null
          currency?: Database["public"]["Enums"]["currency_type"] | null
          day_night?: string | null
          departure_date?: string | null
          egyptian_pax_in?: number | null
          egyptian_pax_out?: number | null
          estimated_foreign_bill?: number | null
          estimated_local_bill?: number | null
          file_flt_plan_qty?: number | null
          fire_cart_qty?: number | null
          flight_no?: string | null
          flight_schedule_id?: string | null
          flight_status?: string | null
          follow_me_qty?: number | null
          foreign_pax_in?: number | null
          foreign_pax_out?: number | null
          fuel_charge?: number | null
          ground_time?: string | null
          handling_fee?: number | null
          handling_type?: Database["public"]["Enums"]["handling_type"] | null
          hotac_charge?: number | null
          housing_charge?: number | null
          housing_days?: number | null
          id?: string | null
          infant_in?: number | null
          infant_out?: number | null
          jetway_qty?: number | null
          landing_charge?: number | null
          met_folder_qty?: number | null
          mtow?: string | null
          ob?: string | null
          operator?: string | null
          parking_charge?: number | null
          parking_day_hours?: number | null
          parking_night_hours?: number | null
          pax_in_adult_d?: number | null
          pax_in_adult_i?: number | null
          pax_in_inf_d?: number | null
          pax_in_inf_i?: number | null
          pax_transit?: number | null
          performed_by?: string | null
          print_ops_flt_plan_qty?: number | null
          project_tags?: string | null
          registration?: string | null
          review_comment?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string | null
          sta?: string | null
          station?: string | null
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number | null
          total_departing_pax?: number | null
          total_parking_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      snapshot_service_reports_pre_phase3b_step2_3: {
        Row: {
          aircraft_type: string | null
          airport_charge: number | null
          arrival_date: string | null
          ata: string | null
          atd: string | null
          catering_charge: number | null
          check_in_system: string | null
          civil_aviation_fee: number | null
          co: string | null
          confirmation_no: string | null
          created_at: string | null
          crew_count: number | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          day_night: string | null
          departure_date: string | null
          egyptian_pax_in: number | null
          egyptian_pax_out: number | null
          estimated_foreign_bill: number | null
          estimated_local_bill: number | null
          file_flt_plan_qty: number | null
          fire_cart_qty: number | null
          flight_no: string | null
          flight_schedule_id: string | null
          flight_status: string | null
          follow_me_qty: number | null
          foreign_pax_in: number | null
          foreign_pax_out: number | null
          fuel_charge: number | null
          ground_time: string | null
          handling_fee: number | null
          handling_type: Database["public"]["Enums"]["handling_type"] | null
          hotac_charge: number | null
          housing_charge: number | null
          housing_days: number | null
          id: string | null
          infant_in: number | null
          infant_out: number | null
          jetway_qty: number | null
          landing_charge: number | null
          met_folder_qty: number | null
          mtow: string | null
          ob: string | null
          operator: string | null
          parking_charge: number | null
          parking_day_hours: number | null
          parking_night_hours: number | null
          pax_in_adult_d: number | null
          pax_in_adult_i: number | null
          pax_in_inf_d: number | null
          pax_in_inf_i: number | null
          pax_transit: number | null
          performed_by: string | null
          print_ops_flt_plan_qty: number | null
          project_tags: string | null
          registration: string | null
          review_comment: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          route: string | null
          sta: string | null
          station: string | null
          std: string | null
          td: string | null
          to: string | null
          total_cost: number | null
          total_departing_pax: number | null
          total_parking_hours: number | null
          updated_at: string | null
        }
        Insert: {
          aircraft_type?: string | null
          airport_charge?: number | null
          arrival_date?: string | null
          ata?: string | null
          atd?: string | null
          catering_charge?: number | null
          check_in_system?: string | null
          civil_aviation_fee?: number | null
          co?: string | null
          confirmation_no?: string | null
          created_at?: string | null
          crew_count?: number | null
          currency?: Database["public"]["Enums"]["currency_type"] | null
          day_night?: string | null
          departure_date?: string | null
          egyptian_pax_in?: number | null
          egyptian_pax_out?: number | null
          estimated_foreign_bill?: number | null
          estimated_local_bill?: number | null
          file_flt_plan_qty?: number | null
          fire_cart_qty?: number | null
          flight_no?: string | null
          flight_schedule_id?: string | null
          flight_status?: string | null
          follow_me_qty?: number | null
          foreign_pax_in?: number | null
          foreign_pax_out?: number | null
          fuel_charge?: number | null
          ground_time?: string | null
          handling_fee?: number | null
          handling_type?: Database["public"]["Enums"]["handling_type"] | null
          hotac_charge?: number | null
          housing_charge?: number | null
          housing_days?: number | null
          id?: string | null
          infant_in?: number | null
          infant_out?: number | null
          jetway_qty?: number | null
          landing_charge?: number | null
          met_folder_qty?: number | null
          mtow?: string | null
          ob?: string | null
          operator?: string | null
          parking_charge?: number | null
          parking_day_hours?: number | null
          parking_night_hours?: number | null
          pax_in_adult_d?: number | null
          pax_in_adult_i?: number | null
          pax_in_inf_d?: number | null
          pax_in_inf_i?: number | null
          pax_transit?: number | null
          performed_by?: string | null
          print_ops_flt_plan_qty?: number | null
          project_tags?: string | null
          registration?: string | null
          review_comment?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string | null
          sta?: string | null
          station?: string | null
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number | null
          total_departing_pax?: number | null
          total_parking_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          aircraft_type?: string | null
          airport_charge?: number | null
          arrival_date?: string | null
          ata?: string | null
          atd?: string | null
          catering_charge?: number | null
          check_in_system?: string | null
          civil_aviation_fee?: number | null
          co?: string | null
          confirmation_no?: string | null
          created_at?: string | null
          crew_count?: number | null
          currency?: Database["public"]["Enums"]["currency_type"] | null
          day_night?: string | null
          departure_date?: string | null
          egyptian_pax_in?: number | null
          egyptian_pax_out?: number | null
          estimated_foreign_bill?: number | null
          estimated_local_bill?: number | null
          file_flt_plan_qty?: number | null
          fire_cart_qty?: number | null
          flight_no?: string | null
          flight_schedule_id?: string | null
          flight_status?: string | null
          follow_me_qty?: number | null
          foreign_pax_in?: number | null
          foreign_pax_out?: number | null
          fuel_charge?: number | null
          ground_time?: string | null
          handling_fee?: number | null
          handling_type?: Database["public"]["Enums"]["handling_type"] | null
          hotac_charge?: number | null
          housing_charge?: number | null
          housing_days?: number | null
          id?: string | null
          infant_in?: number | null
          infant_out?: number | null
          jetway_qty?: number | null
          landing_charge?: number | null
          met_folder_qty?: number | null
          mtow?: string | null
          ob?: string | null
          operator?: string | null
          parking_charge?: number | null
          parking_day_hours?: number | null
          parking_night_hours?: number | null
          pax_in_adult_d?: number | null
          pax_in_adult_i?: number | null
          pax_in_inf_d?: number | null
          pax_in_inf_i?: number | null
          pax_transit?: number | null
          performed_by?: string | null
          print_ops_flt_plan_qty?: number | null
          project_tags?: string | null
          registration?: string | null
          review_comment?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string | null
          sta?: string | null
          station?: string | null
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number | null
          total_departing_pax?: number | null
          total_parking_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_roster: {
        Row: {
          cert_expiry: string | null
          created_at: string
          department: string
          email: string | null
          emergency_contact: string
          employee_id: string
          id: string
          join_date: string | null
          license_no: string
          name: string
          phone: string | null
          qualification: string
          role: string
          shift: Database["public"]["Enums"]["shift_type"]
          shift_end: string | null
          shift_start: string | null
          station: string
          status: Database["public"]["Enums"]["staff_status"]
          training_status: string
          updated_at: string
        }
        Insert: {
          cert_expiry?: string | null
          created_at?: string
          department?: string
          email?: string | null
          emergency_contact?: string
          employee_id: string
          id?: string
          join_date?: string | null
          license_no?: string
          name: string
          phone?: string | null
          qualification?: string
          role?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          shift_end?: string | null
          shift_start?: string | null
          station?: string
          status?: Database["public"]["Enums"]["staff_status"]
          training_status?: string
          updated_at?: string
        }
        Update: {
          cert_expiry?: string | null
          created_at?: string
          department?: string
          email?: string | null
          emergency_contact?: string
          employee_id?: string
          id?: string
          join_date?: string | null
          license_no?: string
          name?: string
          phone?: string | null
          qualification?: string
          role?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          shift_end?: string | null
          shift_start?: string | null
          station?: string
          status?: Database["public"]["Enums"]["staff_status"]
          training_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_bank_profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string
          branch: string | null
          created_at: string
          currency: Database["public"]["Enums"]["finance_currency"]
          iban: string | null
          id: string
          is_default: boolean
          notes: string | null
          service_type: string
          status: string
          supplier_id: string
          swift: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name: string
          branch?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["finance_currency"]
          iban?: string | null
          id?: string
          is_default?: boolean
          notes?: string | null
          service_type: string
          status?: string
          supplier_id: string
          swift?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string
          branch?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["finance_currency"]
          iban?: string | null
          id?: string
          is_default?: boolean
          notes?: string | null
          service_type?: string
          status?: string
          supplier_id?: string
          swift?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bank_profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_list: {
        Row: {
          company_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["finance_currency"]
          end_date: string | null
          id: string
          notes: string | null
          service_type: string
          start_date: string | null
          station_code: string | null
          status: string
          supplier_id: string | null
          tax_rate: number
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["finance_currency"]
          end_date?: string | null
          id?: string
          notes?: string | null
          service_type: string
          start_date?: string | null
          station_code?: string | null
          status?: string
          supplier_id?: string | null
          tax_rate?: number
          unit?: string
          unit_cost: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["finance_currency"]
          end_date?: string | null
          id?: string
          notes?: string | null
          service_type?: string
          start_date?: string | null
          station_code?: string | null
          status?: string
          supplier_id?: string | null
          tax_rate?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_list_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_list_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_calendar_events: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          notes: string | null
          recurrence: string | null
          reminder_days: number
          tax_type: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          event_date: string
          id?: string
          notes?: string | null
          recurrence?: string | null
          reminder_days?: number
          tax_type: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          notes?: string | null
          recurrence?: string | null
          reminder_days?: number
          tax_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_filings: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          due_date: string
          e_invoice_status: string | null
          filing_date: string | null
          id: string
          notes: string | null
          paid_amount: number | null
          period_from: string
          period_to: string
          reference_no: string | null
          status: string
          tax_amount: number | null
          tax_type: string
          taxable_base: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date: string
          e_invoice_status?: string | null
          filing_date?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          period_from: string
          period_to: string
          reference_no?: string | null
          status?: string
          tax_amount?: number | null
          tax_type: string
          taxable_base?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string
          e_invoice_status?: string | null
          filing_date?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          period_from?: string
          period_to?: string
          reference_no?: string | null
          status?: string
          tax_amount?: number | null
          tax_type?: string
          taxable_base?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_filings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_rights: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string
          right_name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          notes?: string
          right_name?: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string
          right_name?: string
          status?: string
        }
        Relationships: []
      }
      treasury_vouchers: {
        Row: {
          account_id: string | null
          airline_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          base_amount: number
          base_currency: Database["public"]["Enums"]["finance_currency"] | null
          cash_account_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["finance_currency"]
          description: string
          exchange_rate: number
          flight_schedule_id: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          parent_pending_id: string | null
          party_name: string | null
          party_type: string | null
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          requires_approval: boolean
          service_type: string | null
          settled_at: string | null
          settled_by: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          supplier_id: string | null
          updated_at: string
          voucher_date: string
          voucher_no: string
          voucher_type: Database["public"]["Enums"]["voucher_type"]
        }
        Insert: {
          account_id?: string | null
          airline_id?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          base_amount?: number
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          cash_account_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["finance_currency"]
          description?: string
          exchange_rate?: number
          flight_schedule_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          parent_pending_id?: string | null
          party_name?: string | null
          party_type?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          requires_approval?: boolean
          service_type?: string | null
          settled_at?: string | null
          settled_by?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          supplier_id?: string | null
          updated_at?: string
          voucher_date?: string
          voucher_no: string
          voucher_type: Database["public"]["Enums"]["voucher_type"]
        }
        Update: {
          account_id?: string | null
          airline_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          base_amount?: number
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          cash_account_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["finance_currency"]
          description?: string
          exchange_rate?: number
          flight_schedule_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          parent_pending_id?: string | null
          party_name?: string | null
          party_type?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          requires_approval?: boolean
          service_type?: string | null
          settled_at?: string | null
          settled_by?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          supplier_id?: string | null
          updated_at?: string
          voucher_date?: string
          voucher_no?: string
          voucher_type?: Database["public"]["Enums"]["voucher_type"]
        }
        Relationships: [
          {
            foreignKeyName: "treasury_vouchers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_vouchers_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_vouchers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_vouchers_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_vouchers_parent_pending_id_fkey"
            columns: ["parent_pending_id"]
            isOneToOne: false
            referencedRelation: "treasury_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_vouchers_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_vouchers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      tube_charges: {
        Row: {
          airport: string
          created_at: string
          id: string
          price: string
          service: string
          unit: string
        }
        Insert: {
          airport?: string
          created_at?: string
          id?: string
          price?: string
          service?: string
          unit?: string
        }
        Update: {
          airport?: string
          created_at?: string
          id?: string
          price?: string
          service?: string
          unit?: string
        }
        Relationships: []
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
      vat_returns: {
        Row: {
          breakdown: Json | null
          company_id: string | null
          created_at: string
          filed_at: string | null
          filed_by: string | null
          id: string
          input_vat: number
          net_vat: number
          notes: string | null
          output_vat: number
          period_month: number
          period_year: number
          reference_no: string | null
          status: string
          total_purchases: number
          total_sales: number
          updated_at: string
        }
        Insert: {
          breakdown?: Json | null
          company_id?: string | null
          created_at?: string
          filed_at?: string | null
          filed_by?: string | null
          id?: string
          input_vat?: number
          net_vat?: number
          notes?: string | null
          output_vat?: number
          period_month: number
          period_year: number
          reference_no?: string | null
          status?: string
          total_purchases?: number
          total_sales?: number
          updated_at?: string
        }
        Update: {
          breakdown?: Json | null
          company_id?: string | null
          created_at?: string
          filed_at?: string | null
          filed_by?: string | null
          id?: string
          input_vat?: number
          net_vat?: number
          notes?: string | null
          output_vat?: number
          period_month?: number
          period_year?: number
          reference_no?: string | null
          status?: string
          total_purchases?: number
          total_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vat_returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_documents: {
        Row: {
          created_at: string
          doc_name: string
          doc_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          notes: string | null
          updated_at: string
          uploaded_by: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          doc_name: string
          doc_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          doc_name?: string
          doc_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_equipment: {
        Row: {
          created_at: string
          equipment: string
          id: string
          rate: string
          status: string
          vendor: string
        }
        Insert: {
          created_at?: string
          equipment?: string
          id?: string
          rate?: string
          status?: string
          vendor?: string
        }
        Update: {
          created_at?: string
          equipment?: string
          id?: string
          rate?: string
          status?: string
          vendor?: string
        }
        Relationships: []
      }
      vendor_invoice_submissions: {
        Row: {
          amount: number
          approved_vendor_invoice_id: string | null
          attachment_url: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_no: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          submission_no: string
          submitted_by: string | null
          total: number
          updated_at: string
          vat: number
          vendor_id: string
        }
        Insert: {
          amount?: number
          approved_vendor_invoice_id?: string | null
          attachment_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_no: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submission_no: string
          submitted_by?: string | null
          total?: number
          updated_at?: string
          vat?: number
          vendor_id: string
        }
        Update: {
          amount?: number
          approved_vendor_invoice_id?: string | null
          attachment_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_no?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submission_no?: string
          submitted_by?: string | null
          total?: number
          updated_at?: string
          vat?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoice_submissions_approved_vendor_invoice_id_fkey"
            columns: ["approved_vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoice_submissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_invoices: {
        Row: {
          amount: number
          client_invoice_id: string | null
          created_at: string
          currency: string
          date: string
          due_date: string
          id: string
          invoice_no: string
          notes: string
          service_report_id: string | null
          status: string
          total: number
          updated_at: string
          vat: number
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          amount?: number
          client_invoice_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          due_date?: string
          id?: string
          invoice_no: string
          notes?: string
          service_report_id?: string | null
          status?: string
          total?: number
          updated_at?: string
          vat?: number
          vendor_id?: string | null
          vendor_name?: string
        }
        Update: {
          amount?: number
          client_invoice_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          due_date?: string
          id?: string
          invoice_no?: string
          notes?: string
          service_report_id?: string | null
          status?: string
          total?: number
          updated_at?: string
          vat?: number
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_client_invoice_id_fkey"
            columns: ["client_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_client_invoice_id_fkey"
            columns: ["client_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_service_report_id_fkey"
            columns: ["service_report_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["service_report_id"]
          },
          {
            foreignKeyName: "vendor_invoices_service_report_id_fkey"
            columns: ["service_report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_service_report_id_fkey"
            columns: ["service_report_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_users_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      wht_certificates: {
        Row: {
          certificate_no: string
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          gross_amount: number
          id: string
          issue_date: string
          net_amount: number
          notes: string | null
          payment_id: string | null
          period_end: string | null
          period_start: string | null
          status: string
          updated_at: string
          vendor_invoice_id: string | null
          vendor_name: string
          vendor_tax_id: string | null
          wht_amount: number
          wht_rate: number
          wht_rule_id: string | null
        }
        Insert: {
          certificate_no: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          gross_amount?: number
          id?: string
          issue_date?: string
          net_amount?: number
          notes?: string | null
          payment_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          updated_at?: string
          vendor_invoice_id?: string | null
          vendor_name: string
          vendor_tax_id?: string | null
          wht_amount?: number
          wht_rate?: number
          wht_rule_id?: string | null
        }
        Update: {
          certificate_no?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          gross_amount?: number
          id?: string
          issue_date?: string
          net_amount?: number
          notes?: string | null
          payment_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          updated_at?: string
          vendor_invoice_id?: string | null
          vendor_name?: string
          vendor_tax_id?: string | null
          wht_amount?: number
          wht_rate?: number
          wht_rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wht_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_certificates_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_certificates_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_certificates_wht_rule_id_fkey"
            columns: ["wht_rule_id"]
            isOneToOne: false
            referencedRelation: "wht_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      wht_rules: {
        Row: {
          active: boolean
          applies_to: string
          code: string
          company_id: string | null
          created_at: string
          id: string
          liability_account_id: string | null
          min_amount: number | null
          name: string
          notes: string | null
          rate: number
          service_category: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to?: string
          code: string
          company_id?: string | null
          created_at?: string
          id?: string
          liability_account_id?: string | null
          min_amount?: number | null
          name: string
          notes?: string | null
          rate?: number
          service_category?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to?: string
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          liability_account_id?: string | null
          min_amount?: number | null
          name?: string
          notes?: string | null
          rate?: number
          service_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wht_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_rules_liability_account_id_fkey"
            columns: ["liability_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_invoice_monthly_summary: {
        Row: {
          airport_charge: number | null
          catering_charge: number | null
          civil_aviation_fee: number | null
          flight_count: number | null
          fuel_charge: number | null
          handling_fee: number | null
          handling_type: string | null
          hotac_charge: number | null
          housing_charge: number | null
          landing_charge: number | null
          month: string | null
          operator: string | null
          parking_charge: number | null
          station: string | null
          total_cost: number | null
        }
        Relationships: []
      }
      security_pending_approval_view: {
        Row: {
          aircraft_type: string | null
          airline_id: string | null
          arrival_date: string | null
          authority: string | null
          clearance_purpose: string | null
          clearance_remarks: string | null
          clearance_type: string | null
          departure_date: string | null
          dispatch_actual_end: string | null
          dispatch_actual_start: string | null
          dispatch_id: string | null
          dispatch_notes: string | null
          dispatch_review_status: string | null
          dispatch_scheduled_end: string | null
          dispatch_scheduled_start: string | null
          dispatch_status: string | null
          dispatch_task_sheet_data: Json | null
          flight_no: string | null
          flight_schedule_id: string | null
          flight_status: Database["public"]["Enums"]["clearance_status"] | null
          registration: string | null
          route: string | null
          service_report_id: string | null
          skd_type: string | null
          sr_handling_type: Database["public"]["Enums"]["handling_type"] | null
          sr_review_status: string | null
          sr_reviewed_at: string | null
          sr_reviewed_by: string | null
          sta: string | null
          std: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_schedules_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_invoices: {
        Row: {
          airline_iata: string | null
          airport_charges: number | null
          base_currency: Database["public"]["Enums"]["finance_currency"] | null
          base_total: number | null
          billing_period: string | null
          catering: number | null
          civil_aviation: number | null
          company_id: string | null
          created_at: string | null
          credit_note_ref: string | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          date: string | null
          description: string | null
          draft_status: string | null
          due_date: string | null
          exchange_rate: number | null
          exchange_rate_date: string | null
          finalized_at: string | null
          finalized_by: string | null
          flight_ref: string | null
          flight_schedule_id: string | null
          handling: number | null
          id: string | null
          invoice_direction:
            | Database["public"]["Enums"]["invoice_direction"]
            | null
          invoice_no: string | null
          invoice_type: string | null
          journal_entry_id: string | null
          notes: string | null
          operator: string | null
          other: number | null
          payment_date: string | null
          payment_ref: string | null
          sent_at: string | null
          sent_to: string | null
          service_report_id: string | null
          service_type: string | null
          source: string | null
          station: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number | null
          supplier_id: string | null
          total: number | null
          transaction_currency:
            | Database["public"]["Enums"]["finance_currency"]
            | null
          updated_at: string | null
          vat: number | null
        }
        Insert: {
          airline_iata?: string | null
          airport_charges?: number | null
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          base_total?: number | null
          billing_period?: string | null
          catering?: number | null
          civil_aviation?: number | null
          company_id?: string | null
          created_at?: string | null
          credit_note_ref?: string | null
          currency?: Database["public"]["Enums"]["currency_type"] | null
          date?: string | null
          description?: string | null
          draft_status?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          flight_ref?: string | null
          flight_schedule_id?: string | null
          handling?: number | null
          id?: string | null
          invoice_direction?:
            | Database["public"]["Enums"]["invoice_direction"]
            | null
          invoice_no?: string | null
          invoice_type?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          operator?: string | null
          other?: number | null
          payment_date?: string | null
          payment_ref?: string | null
          sent_at?: string | null
          sent_to?: string | null
          service_report_id?: string | null
          service_type?: string | null
          source?: string | null
          station?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          supplier_id?: string | null
          total?: number | null
          transaction_currency?:
            | Database["public"]["Enums"]["finance_currency"]
            | null
          updated_at?: string | null
          vat?: number | null
        }
        Update: {
          airline_iata?: string | null
          airport_charges?: number | null
          base_currency?: Database["public"]["Enums"]["finance_currency"] | null
          base_total?: number | null
          billing_period?: string | null
          catering?: number | null
          civil_aviation?: number | null
          company_id?: string | null
          created_at?: string | null
          credit_note_ref?: string | null
          currency?: Database["public"]["Enums"]["currency_type"] | null
          date?: string | null
          description?: string | null
          draft_status?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          flight_ref?: string | null
          flight_schedule_id?: string | null
          handling?: number | null
          id?: string | null
          invoice_direction?:
            | Database["public"]["Enums"]["invoice_direction"]
            | null
          invoice_no?: string | null
          invoice_type?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          operator?: string | null
          other?: number | null
          payment_date?: string | null
          payment_ref?: string | null
          sent_at?: string | null
          sent_to?: string | null
          service_report_id?: string | null
          service_type?: string | null
          source?: string | null
          station?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          supplier_id?: string | null
          total?: number | null
          transaction_currency?:
            | Database["public"]["Enums"]["finance_currency"]
            | null
          updated_at?: string | null
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "finance_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dispatch_with_flight: {
        Row: {
          actual_duration_hours: number | null
          actual_end: string | null
          actual_start: string | null
          airline: string | null
          base_fee: number | null
          charges_breakdown: Json | null
          charges_currency: string | null
          contract_duration_hours: number | null
          contract_id: string | null
          created_at: string | null
          created_via: string | null
          dispatched_by: string | null
          extra_manpower_count: number | null
          flight_date: string | null
          flight_no: string | null
          flight_schedule_id: string | null
          fs_aircraft_type: string | null
          fs_airline_id: string | null
          fs_arrival_date: string | null
          fs_authority: string | null
          fs_clearance_type: string | null
          fs_departure_date: string | null
          fs_flight_no: string | null
          fs_id: string | null
          fs_registration: string | null
          fs_route: string | null
          fs_skd_type: string | null
          fs_sta: string | null
          fs_status: Database["public"]["Enums"]["clearance_status"] | null
          fs_std: string | null
          id: string | null
          irregularity_id: string | null
          notes: string | null
          overtime_charge: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          ramp_vehicle_trips: number | null
          return_to_ramp_with_load: boolean | null
          review_comment: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          service_rate: number | null
          service_type: string | null
          short_notice: boolean | null
          staff_count: number | null
          staff_names: string | null
          station: string | null
          status: string | null
          task_sheet_data: Json | null
          total_charge: number | null
          total_security_charges: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_assignments_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "flight_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_assignments_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["flight_schedule_id"]
          },
          {
            foreignKeyName: "dispatch_assignments_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_dispatch_with_flight"
            referencedColumns: ["fs_id"]
          },
          {
            foreignKeyName: "dispatch_assignments_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["fs_id"]
          },
          {
            foreignKeyName: "dispatch_assignments_irregularity_id_fkey"
            columns: ["irregularity_id"]
            isOneToOne: false
            referencedRelation: "irregularity_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_schedules_airline_id_fkey"
            columns: ["fs_airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
        ]
      }
      v_service_report_with_flight: {
        Row: {
          aircraft_type: string | null
          airport_charge: number | null
          arrival_date: string | null
          ata: string | null
          atd: string | null
          catering_charge: number | null
          check_in_system: string | null
          civil_aviation_fee: number | null
          co: string | null
          confirmation_no: string | null
          created_at: string | null
          crew_count: number | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          day_night: string | null
          departure_date: string | null
          egyptian_pax_in: number | null
          egyptian_pax_out: number | null
          estimated_foreign_bill: number | null
          estimated_local_bill: number | null
          file_flt_plan_qty: number | null
          fire_cart_qty: number | null
          flight_no: string | null
          flight_schedule_id: string | null
          flight_status: string | null
          follow_me_qty: number | null
          foreign_pax_in: number | null
          foreign_pax_out: number | null
          fs_aircraft_type: string | null
          fs_airline_id: string | null
          fs_arrival_date: string | null
          fs_authority: string | null
          fs_clearance_type: string | null
          fs_departure_date: string | null
          fs_flight_no: string | null
          fs_id: string | null
          fs_registration: string | null
          fs_route: string | null
          fs_skd_type: string | null
          fs_sta: string | null
          fs_status: Database["public"]["Enums"]["clearance_status"] | null
          fs_std: string | null
          fuel_charge: number | null
          ground_time: string | null
          handling_fee: number | null
          handling_type: Database["public"]["Enums"]["handling_type"] | null
          hotac_charge: number | null
          housing_charge: number | null
          housing_days: number | null
          id: string | null
          infant_in: number | null
          infant_out: number | null
          jetway_qty: number | null
          landing_charge: number | null
          met_folder_qty: number | null
          mtow: string | null
          ob: string | null
          operator: string | null
          parking_charge: number | null
          parking_day_hours: number | null
          parking_night_hours: number | null
          pax_in_adult_d: number | null
          pax_in_adult_i: number | null
          pax_in_inf_d: number | null
          pax_in_inf_i: number | null
          pax_transit: number | null
          performed_by: string | null
          print_ops_flt_plan_qty: number | null
          project_tags: string | null
          registration: string | null
          review_comment: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          route: string | null
          sta: string | null
          station: string | null
          std: string | null
          td: string | null
          to: string | null
          total_cost: number | null
          total_departing_pax: number | null
          total_parking_hours: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_schedules_airline_id_fkey"
            columns: ["fs_airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reports_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "flight_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reports_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "security_pending_approval_view"
            referencedColumns: ["flight_schedule_id"]
          },
          {
            foreignKeyName: "service_reports_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_dispatch_with_flight"
            referencedColumns: ["fs_id"]
          },
          {
            foreignKeyName: "service_reports_flight_schedule_id_fkey"
            columns: ["flight_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_service_report_with_flight"
            referencedColumns: ["fs_id"]
          },
        ]
      }
    }
    Functions: {
      compute_aging_bucket: { Args: { _days_overdue: number }; Returns: string }
      compute_vat_return: {
        Args: { _company?: string; _month: number; _year: number }
        Returns: {
          input_vat: number
          net_vat: number
          output_vat: number
          total_purchases: number
          total_sales: number
        }[]
      }
      current_customer_airline_iata: { Args: never; Returns: string }
      current_vendor_id: { Args: never; Returns: string }
      get_budget_variance: {
        Args: { _month?: number; _year: number }
        Returns: {
          account_code: string
          account_name: string
          actual_amount: number
          alert_threshold_pct: number
          budget_amount: number
          budget_id: string
          cost_center: string
          currency: string
          fiscal_year: number
          period_month: number
          variance_amount: number
          variance_pct: number
        }[]
      }
      get_cash_flow_forecast: {
        Args: { _start?: string; _weeks?: number }
        Returns: {
          ap_outflow: number
          ar_inflow: number
          closing_balance: number
          net_change: number
          opening_balance: number
          recurring_inflow: number
          week_end: string
          week_index: number
          week_start: string
        }[]
      }
      get_customer_statement: {
        Args: { _airline_iata?: string; _from: string; _to: string }
        Returns: {
          credit: number
          currency: string
          debit: number
          description: string
          entry_date: string
          entry_type: string
          reference: string
          running_balance: number
        }[]
      }
      get_pending_reminders: {
        Args: never
        Returns: {
          airline_iata: string
          currency: string
          days_overdue: number
          due_date: string
          invoice_date: string
          invoice_id: string
          invoice_no: string
          last_reminder_at: string
          last_reminder_level: number
          next_level: number
          next_level_name: string
          operator: string
          total: number
        }[]
      }
      has_finance_access: { Args: { _user_id: string }; Returns: boolean }
      has_ops_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_period_locked: { Args: { _d: string }; Returns: boolean }
      notify_finance_users: {
        Args: {
          _category: string
          _link?: string
          _message: string
          _title: string
        }
        Returns: undefined
      }
      recalc_bank_reconciliation: {
        Args: { _id: string }
        Returns: {
          bank_account_id: string
          created_at: string
          difference: number
          id: string
          notes: string | null
          statement_balance: number
          statement_date: string
          status: string
          system_balance: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bank_reconciliations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_collection_cases_aging: { Args: never; Returns: number }
      refresh_invoice_monthly_summary: { Args: never; Returns: undefined }
      return_flight_to_clearance: {
        Args: { _id: string; _stamp: string }
        Returns: {
          aircraft_type: string
          airline_id: string | null
          arrival_date: string | null
          arrival_flight: string | null
          authority: string
          cargo_kg: number
          clearance_type: string
          config: number | null
          created_at: string
          created_via: string | null
          departure_date: string | null
          departure_flight: string | null
          flight_no: string
          handling: string | null
          handling_agent: string
          id: string
          no_of_flights: number | null
          notes: string | null
          passengers: number
          period_from: string | null
          period_to: string | null
          permit_no: string
          purpose: string
          ref_no: string | null
          registration: string
          remarks: string
          requested_date: string | null
          route: string
          royalty: boolean | null
          skd_type: string | null
          sta: string | null
          status: Database["public"]["Enums"]["clearance_status"]
          std: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          week_days: string | null
        }
        SetofOptions: {
          from: "*"
          to: "flight_schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suggest_ic_eliminations: {
        Args: { _from: string; _to: string }
        Returns: {
          amount: number
          base_amount: number
          currency: string
          description: string
          from_company_id: string
          ic_id: string
          ic_no: string
          reconciled: boolean
          to_company_id: string
          transaction_date: string
        }[]
      }
      update_flight_master_from_station: {
        Args: { _id: string; _patch: Json }
        Returns: {
          aircraft_type: string
          airline_id: string | null
          arrival_date: string | null
          arrival_flight: string | null
          authority: string
          cargo_kg: number
          clearance_type: string
          config: number | null
          created_at: string
          created_via: string | null
          departure_date: string | null
          departure_flight: string | null
          flight_no: string
          handling: string | null
          handling_agent: string
          id: string
          no_of_flights: number | null
          notes: string | null
          passengers: number
          period_from: string | null
          period_to: string | null
          permit_no: string
          purpose: string
          ref_no: string | null
          registration: string
          remarks: string
          requested_date: string | null
          route: string
          royalty: boolean | null
          skd_type: string | null
          sta: string | null
          status: Database["public"]["Enums"]["clearance_status"]
          std: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          week_days: string | null
        }
        SetofOptions: {
          from: "*"
          to: "flight_schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wht_summary: {
        Args: { _from: string; _to: string }
        Returns: {
          certificate_count: number
          currency: string
          gross_amount: number
          vendor_name: string
          wht_amount: number
        }[]
      }
    }
    Enums: {
      account_type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"
      app_role:
        | "admin"
        | "station_manager"
        | "station_ops"
        | "employee"
        | "clearance"
        | "contracts"
        | "operations"
        | "receivables"
        | "payables"
        | "general_accounts"
        | "accountant"
        | "viewer"
      cheque_status: "issued" | "sent" | "cleared" | "bounced" | "cancelled"
      clearance_status:
        | "Pending"
        | "Approved"
        | "Rejected"
        | "Expired"
        | "Cancelled"
        | "Completed"
      collection_cheque_status: "received" | "deposited" | "cleared" | "bounced"
      contract_status: "Active" | "Expired" | "Pending" | "Terminated"
      currency_type: "USD" | "EUR" | "EGP"
      finance_currency:
        | "EGP"
        | "AED"
        | "MAD"
        | "JOD"
        | "USD"
        | "EUR"
        | "SAR"
        | "GBP"
      handling_type:
        | "Turn Around"
        | "Night Stop"
        | "Transit"
        | "Technical"
        | "Ferry In"
        | "Ferry Out"
        | "VIP Hall"
        | "Overflying"
        | "Diversion"
        | "Ambulance"
        | "Crew Change"
        | "Fuel Stop"
        | "AVSEC Only"
        | "Full Handling"
        | "Ramp Only"
        | "Arrival Security"
        | "Departure Security"
        | "Maintenance Security"
        | "Turnaround Security"
      incentive_period: "Monthly" | "Quarterly" | "Semi-Annual" | "Annual"
      incentive_type:
        | "Volume"
        | "Revenue"
        | "Growth"
        | "Loyalty"
        | "Performance"
      invoice_direction: "AR" | "AP"
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled"
      invoice_type: "Preliminary" | "Final"
      journal_status: "Draft" | "Posted" | "Void"
      loan_status:
        | "requested"
        | "approved"
        | "rejected"
        | "active"
        | "completed"
        | "cancelled"
      lost_found_status:
        | "Reported"
        | "In Storage"
        | "Claimed"
        | "Forwarded"
        | "Disposed"
      objection_status:
        | "sent"
        | "under_negotiation"
        | "resolved"
        | "escalated"
        | "frozen"
      overfly_status:
        | "Approved"
        | "Pending"
        | "Rejected"
        | "Expired"
        | "Cancelled"
      service_category:
        | "Civil Aviation"
        | "Ground Handling"
        | "Catering"
        | "Hotac"
        | "Fuel"
        | "Security"
        | "Special Services"
        | "Transport"
        | "VIP"
      shift_type: "Morning" | "Afternoon" | "Night" | "Split" | "Off"
      staff_status: "Active" | "On Leave" | "Training" | "Suspended"
      voucher_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "posted"
        | "settled"
        | "void"
      voucher_type: "receipt" | "payment" | "pending"
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
      account_type: ["Asset", "Liability", "Equity", "Revenue", "Expense"],
      app_role: [
        "admin",
        "station_manager",
        "station_ops",
        "employee",
        "clearance",
        "contracts",
        "operations",
        "receivables",
        "payables",
        "general_accounts",
        "accountant",
        "viewer",
      ],
      cheque_status: ["issued", "sent", "cleared", "bounced", "cancelled"],
      clearance_status: [
        "Pending",
        "Approved",
        "Rejected",
        "Expired",
        "Cancelled",
        "Completed",
      ],
      collection_cheque_status: ["received", "deposited", "cleared", "bounced"],
      contract_status: ["Active", "Expired", "Pending", "Terminated"],
      currency_type: ["USD", "EUR", "EGP"],
      finance_currency: [
        "EGP",
        "AED",
        "MAD",
        "JOD",
        "USD",
        "EUR",
        "SAR",
        "GBP",
      ],
      handling_type: [
        "Turn Around",
        "Night Stop",
        "Transit",
        "Technical",
        "Ferry In",
        "Ferry Out",
        "VIP Hall",
        "Overflying",
        "Diversion",
        "Ambulance",
        "Crew Change",
        "Fuel Stop",
        "AVSEC Only",
        "Full Handling",
        "Ramp Only",
        "Arrival Security",
        "Departure Security",
        "Maintenance Security",
        "Turnaround Security",
      ],
      incentive_period: ["Monthly", "Quarterly", "Semi-Annual", "Annual"],
      incentive_type: ["Volume", "Revenue", "Growth", "Loyalty", "Performance"],
      invoice_direction: ["AR", "AP"],
      invoice_status: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"],
      invoice_type: ["Preliminary", "Final"],
      journal_status: ["Draft", "Posted", "Void"],
      loan_status: [
        "requested",
        "approved",
        "rejected",
        "active",
        "completed",
        "cancelled",
      ],
      lost_found_status: [
        "Reported",
        "In Storage",
        "Claimed",
        "Forwarded",
        "Disposed",
      ],
      objection_status: [
        "sent",
        "under_negotiation",
        "resolved",
        "escalated",
        "frozen",
      ],
      overfly_status: [
        "Approved",
        "Pending",
        "Rejected",
        "Expired",
        "Cancelled",
      ],
      service_category: [
        "Civil Aviation",
        "Ground Handling",
        "Catering",
        "Hotac",
        "Fuel",
        "Security",
        "Special Services",
        "Transport",
        "VIP",
      ],
      shift_type: ["Morning", "Afternoon", "Night", "Split", "Off"],
      staff_status: ["Active", "On Leave", "Training", "Suspended"],
      voucher_status: [
        "draft",
        "pending_approval",
        "approved",
        "posted",
        "settled",
        "void",
      ],
      voucher_type: ["receipt", "payment", "pending"],
    },
  },
} as const
