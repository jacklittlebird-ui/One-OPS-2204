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
      contracts: {
        Row: {
          airline: string
          airline_iata: string | null
          annual_value: number
          auto_renew: boolean
          contract_no: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          end_date: string
          id: string
          notes: string | null
          services: string | null
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
          contract_no: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          end_date: string
          id?: string
          notes?: string | null
          services?: string | null
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
          contract_no?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          end_date?: string
          id?: string
          notes?: string | null
          services?: string | null
          start_date?: string
          stations?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: []
      }
      flight_schedules: {
        Row: {
          aircraft: string
          airline: string
          arrival: string
          created_at: string
          days: string
          departure: string
          destination: string
          flight_no: string
          id: string
          origin: string
          status: Database["public"]["Enums"]["flight_status"]
          terminal: string
          updated_at: string
        }
        Insert: {
          aircraft?: string
          airline: string
          arrival: string
          created_at?: string
          days?: string
          departure: string
          destination: string
          flight_no: string
          id?: string
          origin: string
          status?: Database["public"]["Enums"]["flight_status"]
          terminal?: string
          updated_at?: string
        }
        Update: {
          aircraft?: string
          airline?: string
          arrival?: string
          created_at?: string
          days?: string
          departure?: string
          destination?: string
          flight_no?: string
          id?: string
          origin?: string
          status?: Database["public"]["Enums"]["flight_status"]
          terminal?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          airline_iata: string | null
          airport_charges: number
          catering: number
          civil_aviation: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          date: string
          description: string | null
          due_date: string
          flight_ref: string | null
          handling: number
          id: string
          invoice_no: string
          notes: string | null
          operator: string
          other: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
          vat: number
        }
        Insert: {
          airline_iata?: string | null
          airport_charges?: number
          catering?: number
          civil_aviation?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          description?: string | null
          due_date?: string
          flight_ref?: string | null
          handling?: number
          id?: string
          invoice_no: string
          notes?: string | null
          operator: string
          other?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          airline_iata?: string | null
          airport_charges?: number
          catering?: number
          civil_aviation?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          date?: string
          description?: string | null
          due_date?: string
          flight_ref?: string | null
          handling?: number
          id?: string
          invoice_no?: string
          notes?: string | null
          operator?: string
          other?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
        }
        Relationships: []
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
          id: string
          notes: string | null
          owner_contact: string | null
          owner_name: string | null
          report_date: string
          station: string
          status: Database["public"]["Enums"]["lost_found_status"]
          storage_location: string | null
          updated_at: string
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
          id?: string
          notes?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          report_date?: string
          station?: string
          status?: Database["public"]["Enums"]["lost_found_status"]
          storage_location?: string | null
          updated_at?: string
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
          id?: string
          notes?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          report_date?: string
          station?: string
          status?: Database["public"]["Enums"]["lost_found_status"]
          storage_location?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      overfly_schedules: {
        Row: {
          aircraft_type: string | null
          altitude: string | null
          created_at: string
          currency: string
          entry_point: string | null
          entry_time: string | null
          exit_point: string | null
          exit_time: string | null
          fee: number
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
        }
        Insert: {
          aircraft_type?: string | null
          altitude?: string | null
          created_at?: string
          currency?: string
          entry_point?: string | null
          entry_time?: string | null
          exit_point?: string | null
          exit_time?: string | null
          fee?: number
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
        }
        Update: {
          aircraft_type?: string | null
          altitude?: string | null
          created_at?: string
          currency?: string
          entry_point?: string | null
          entry_time?: string | null
          exit_point?: string | null
          exit_time?: string | null
          fee?: number
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
      service_reports: {
        Row: {
          aircraft_type: string
          airport_charge: number
          arrival_date: string | null
          check_in_system: string | null
          civil_aviation_fee: number
          co: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          day_night: string
          departure_date: string | null
          flight_no: string
          ground_time: string | null
          handling_fee: number
          handling_type: Database["public"]["Enums"]["handling_type"]
          id: string
          mtow: string
          ob: string | null
          operator: string
          pax_in_adult_d: number
          pax_in_adult_i: number
          pax_in_inf_d: number
          pax_in_inf_i: number
          pax_transit: number
          performed_by: string | null
          project_tags: string | null
          registration: string
          route: string
          sta: string | null
          station: string
          std: string | null
          td: string | null
          to: string | null
          total_cost: number
          updated_at: string
        }
        Insert: {
          aircraft_type?: string
          airport_charge?: number
          arrival_date?: string | null
          check_in_system?: string | null
          civil_aviation_fee?: number
          co?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          day_night?: string
          departure_date?: string | null
          flight_no: string
          ground_time?: string | null
          handling_fee?: number
          handling_type?: Database["public"]["Enums"]["handling_type"]
          id?: string
          mtow?: string
          ob?: string | null
          operator: string
          pax_in_adult_d?: number
          pax_in_adult_i?: number
          pax_in_inf_d?: number
          pax_in_inf_i?: number
          pax_transit?: number
          performed_by?: string | null
          project_tags?: string | null
          registration?: string
          route?: string
          sta?: string | null
          station?: string
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number
          updated_at?: string
        }
        Update: {
          aircraft_type?: string
          airport_charge?: number
          arrival_date?: string | null
          check_in_system?: string | null
          civil_aviation_fee?: number
          co?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          day_night?: string
          departure_date?: string | null
          flight_no?: string
          ground_time?: string | null
          handling_fee?: number
          handling_type?: Database["public"]["Enums"]["handling_type"]
          id?: string
          mtow?: string
          ob?: string | null
          operator?: string
          pax_in_adult_d?: number
          pax_in_adult_i?: number
          pax_in_inf_d?: number
          pax_in_inf_i?: number
          pax_transit?: number
          performed_by?: string | null
          project_tags?: string | null
          registration?: string
          route?: string
          sta?: string | null
          station?: string
          std?: string | null
          td?: string | null
          to?: string | null
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_roster: {
        Row: {
          cert_expiry: string | null
          created_at: string
          department: string
          email: string | null
          employee_id: string
          id: string
          join_date: string | null
          name: string
          phone: string | null
          role: string
          shift: Database["public"]["Enums"]["shift_type"]
          shift_end: string | null
          shift_start: string | null
          station: string
          status: Database["public"]["Enums"]["staff_status"]
          updated_at: string
        }
        Insert: {
          cert_expiry?: string | null
          created_at?: string
          department?: string
          email?: string | null
          employee_id: string
          id?: string
          join_date?: string | null
          name: string
          phone?: string | null
          role?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          shift_end?: string | null
          shift_start?: string | null
          station?: string
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
        }
        Update: {
          cert_expiry?: string | null
          created_at?: string
          department?: string
          email?: string | null
          employee_id?: string
          id?: string
          join_date?: string | null
          name?: string
          phone?: string | null
          role?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          shift_end?: string | null
          shift_start?: string | null
          station?: string
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
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
      app_role: "admin" | "station_manager" | "station_ops" | "employee"
      contract_status: "Active" | "Expired" | "Pending" | "Terminated"
      currency_type: "USD" | "EUR" | "EGP"
      flight_status: "Scheduled" | "Delayed" | "Cancelled" | "Completed"
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
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled"
      lost_found_status:
        | "Reported"
        | "In Storage"
        | "Claimed"
        | "Forwarded"
        | "Disposed"
      overfly_status: "Approved" | "Pending" | "Rejected" | "Expired"
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
      app_role: ["admin", "station_manager", "station_ops", "employee"],
      contract_status: ["Active", "Expired", "Pending", "Terminated"],
      currency_type: ["USD", "EUR", "EGP"],
      flight_status: ["Scheduled", "Delayed", "Cancelled", "Completed"],
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
      invoice_status: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"],
      lost_found_status: [
        "Reported",
        "In Storage",
        "Claimed",
        "Forwarded",
        "Disposed",
      ],
      overfly_status: ["Approved", "Pending", "Rejected", "Expired"],
      shift_type: ["Morning", "Afternoon", "Night", "Split", "Off"],
      staff_status: ["Active", "On Leave", "Training", "Suspended"],
    },
  },
} as const
