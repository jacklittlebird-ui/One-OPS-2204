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
          status: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
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
          status?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
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
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
          billing_frequency: string
          contact_email: string
          contact_person: string
          contract_no: string
          contract_type: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          end_date: string
          id: string
          notes: string | null
          payment_terms: string
          services: string | null
          sgha_ref: string
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
          billing_frequency?: string
          contact_email?: string
          contact_person?: string
          contract_no: string
          contract_type?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          end_date: string
          id?: string
          notes?: string | null
          payment_terms?: string
          services?: string | null
          sgha_ref?: string
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
          billing_frequency?: string
          contact_email?: string
          contact_person?: string
          contract_no?: string
          contract_type?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          end_date?: string
          id?: string
          notes?: string | null
          payment_terms?: string
          services?: string | null
          sgha_ref?: string
          start_date?: string
          stations?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: []
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
      invoices: {
        Row: {
          airline_iata: string | null
          airport_charges: number
          billing_period: string
          catering: number
          civil_aviation: number
          created_at: string
          credit_note_ref: string
          currency: Database["public"]["Enums"]["currency_type"]
          date: string
          description: string | null
          due_date: string
          finalized_at: string | null
          finalized_by: string | null
          flight_ref: string | null
          handling: number
          id: string
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
          station: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
          vat: number
        }
        Insert: {
          airline_iata?: string | null
          airport_charges?: number
          billing_period?: string
          catering?: number
          civil_aviation?: number
          created_at?: string
          credit_note_ref?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          description?: string | null
          due_date?: string
          finalized_at?: string | null
          finalized_by?: string | null
          flight_ref?: string | null
          handling?: number
          id?: string
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
          station?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          airline_iata?: string | null
          airport_charges?: number
          billing_period?: string
          catering?: number
          civil_aviation?: number
          created_at?: string
          credit_note_ref?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          description?: string | null
          due_date?: string
          finalized_at?: string | null
          finalized_by?: string | null
          flight_ref?: string | null
          handling?: number
          id?: string
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
          station?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
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
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          description: string
          entry_id: string
          id: string
          sort_order: number
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          description?: string
          entry_id: string
          id?: string
          sort_order?: number
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          description?: string
          entry_id?: string
          id?: string
          sort_order?: number
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
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
            referencedRelation: "service_reports"
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
            referencedRelation: "service_reports"
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
            referencedRelation: "service_reports"
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
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reports: {
        Row: {
          aircraft_type: string
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
          flight_no: string
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
          registration: string
          review_comment: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          route: string
          sta: string | null
          station: string
          std: string | null
          td: string | null
          to: string | null
          total_cost: number
          total_departing_pax: number
          total_parking_hours: number
          updated_at: string
        }
        Insert: {
          aircraft_type?: string
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
          flight_no: string
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
          registration?: string
          review_comment?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string
          sta?: string | null
          station?: string
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number
          total_departing_pax?: number
          total_parking_hours?: number
          updated_at?: string
        }
        Update: {
          aircraft_type?: string
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
          flight_no?: string
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
          registration?: string
          review_comment?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string
          sta?: string | null
          station?: string
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number
          total_departing_pax?: number
          total_parking_hours?: number
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "vendor_invoices_service_report_id_fkey"
            columns: ["service_report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
      clearance_status:
        | "Pending"
        | "Approved"
        | "Rejected"
        | "Expired"
        | "Cancelled"
      contract_status: "Active" | "Expired" | "Pending" | "Terminated"
      currency_type: "USD" | "EUR" | "EGP"
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
      incentive_period: "Monthly" | "Quarterly" | "Semi-Annual" | "Annual"
      incentive_type:
        | "Volume"
        | "Revenue"
        | "Growth"
        | "Loyalty"
        | "Performance"
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled"
      invoice_type: "Preliminary" | "Final"
      journal_status: "Draft" | "Posted" | "Void"
      lost_found_status:
        | "Reported"
        | "In Storage"
        | "Claimed"
        | "Forwarded"
        | "Disposed"
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
      ],
      clearance_status: [
        "Pending",
        "Approved",
        "Rejected",
        "Expired",
        "Cancelled",
      ],
      contract_status: ["Active", "Expired", "Pending", "Terminated"],
      currency_type: ["USD", "EUR", "EGP"],
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
      ],
      incentive_period: ["Monthly", "Quarterly", "Semi-Annual", "Annual"],
      incentive_type: ["Volume", "Revenue", "Growth", "Loyalty", "Performance"],
      invoice_status: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"],
      invoice_type: ["Preliminary", "Final"],
      journal_status: ["Draft", "Posted", "Void"],
      lost_found_status: [
        "Reported",
        "In Storage",
        "Claimed",
        "Forwarded",
        "Disposed",
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
    },
  },
} as const
