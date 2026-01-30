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
      activity_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string
          description: string
          id: string
          is_public: boolean | null
          metadata: Json | null
          service_id: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string
          description: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          service_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "technician_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          appliance_type: string | null
          brand: string | null
          code: string | null
          converted_service_id: string | null
          created_at: string
          customer_id: string | null
          estimated_labor: number | null
          estimated_parts: number | null
          estimated_total: number | null
          fault_description: string | null
          id: string
          model: string | null
          notes: string | null
          status: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          appliance_type?: string | null
          brand?: string | null
          code?: string | null
          converted_service_id?: string | null
          created_at?: string
          customer_id?: string | null
          estimated_labor?: number | null
          estimated_parts?: number | null
          estimated_total?: number | null
          fault_description?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          appliance_type?: string | null
          brand?: string | null
          code?: string | null
          converted_service_id?: string | null
          created_at?: string
          customer_id?: string | null
          estimated_labor?: number | null
          estimated_parts?: number | null
          estimated_total?: number | null
          fault_description?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_converted_service_id_fkey"
            columns: ["converted_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_converted_service_id_fkey"
            columns: ["converted_service_id"]
            isOneToOne: false
            referencedRelation: "technician_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_converted_service_id_fkey"
            columns: ["converted_service_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          customer_type: string | null
          email: string | null
          id: string
          name: string
          nif: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          name: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          name?: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string | null
          service_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string | null
          service_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string | null
          service_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "technician_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_parts: {
        Row: {
          arrived: boolean | null
          cost: number | null
          created_at: string
          estimated_arrival: string | null
          id: string
          is_requested: boolean | null
          notes: string | null
          part_code: string | null
          part_name: string
          quantity: number | null
          service_id: string
        }
        Insert: {
          arrived?: boolean | null
          cost?: number | null
          created_at?: string
          estimated_arrival?: string | null
          id?: string
          is_requested?: boolean | null
          notes?: string | null
          part_code?: string | null
          part_name: string
          quantity?: number | null
          service_id: string
        }
        Update: {
          arrived?: boolean | null
          cost?: number | null
          created_at?: string
          estimated_arrival?: string | null
          id?: string
          is_requested?: boolean | null
          notes?: string | null
          part_code?: string | null
          part_name?: string
          quantity?: number | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_parts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_parts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "technician_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_parts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_payments: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_date: string | null
          payment_method: string | null
          received_by: string | null
          service_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          received_by?: string | null
          service_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          received_by?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "technician_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_photos: {
        Row: {
          description: string | null
          file_url: string
          id: string
          photo_type: string | null
          service_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          file_url: string
          id?: string
          photo_type?: string | null
          service_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          file_url?: string
          id?: string
          photo_type?: string | null
          service_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_photos_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_photos_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "technician_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_photos_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_signatures: {
        Row: {
          file_url: string
          id: string
          service_id: string
          signature_type: string | null
          signed_at: string
          signer_name: string | null
        }
        Insert: {
          file_url: string
          id?: string
          service_id: string
          signature_type?: string | null
          signed_at?: string
          signer_name?: string | null
        }
        Update: {
          file_url?: string
          id?: string
          service_id?: string
          signature_type?: string | null
          signed_at?: string
          signer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_signatures_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_signatures_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "technician_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_signatures_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          amount_paid: number | null
          appliance_type: string | null
          brand: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          delivery_date: string | null
          delivery_method: string | null
          delivery_technician_id: string | null
          detected_fault: string | null
          discount: number | null
          fault_description: string | null
          final_price: number | null
          id: string
          is_installation: boolean | null
          is_sale: boolean | null
          is_urgent: boolean | null
          is_warranty: boolean | null
          labor_cost: number | null
          last_status_before_part_request: string | null
          model: string | null
          notes: string | null
          parts_cost: number | null
          pending_pricing: boolean | null
          pickup_date: string | null
          pricing_description: string | null
          scheduled_date: string | null
          scheduled_shift: string | null
          serial_number: string | null
          service_address: string | null
          service_city: string | null
          service_location: string | null
          service_postal_code: string | null
          service_type: string | null
          status: string | null
          technician_id: string | null
          updated_at: string
          warranty_brand: string | null
          warranty_process_number: string | null
          work_performed: string | null
        }
        Insert: {
          amount_paid?: number | null
          appliance_type?: string | null
          brand?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_date?: string | null
          delivery_method?: string | null
          delivery_technician_id?: string | null
          detected_fault?: string | null
          discount?: number | null
          fault_description?: string | null
          final_price?: number | null
          id?: string
          is_installation?: boolean | null
          is_sale?: boolean | null
          is_urgent?: boolean | null
          is_warranty?: boolean | null
          labor_cost?: number | null
          last_status_before_part_request?: string | null
          model?: string | null
          notes?: string | null
          parts_cost?: number | null
          pending_pricing?: boolean | null
          pickup_date?: string | null
          pricing_description?: string | null
          scheduled_date?: string | null
          scheduled_shift?: string | null
          serial_number?: string | null
          service_address?: string | null
          service_city?: string | null
          service_location?: string | null
          service_postal_code?: string | null
          service_type?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
          warranty_brand?: string | null
          warranty_process_number?: string | null
          work_performed?: string | null
        }
        Update: {
          amount_paid?: number | null
          appliance_type?: string | null
          brand?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_date?: string | null
          delivery_method?: string | null
          delivery_technician_id?: string | null
          detected_fault?: string | null
          discount?: number | null
          fault_description?: string | null
          final_price?: number | null
          id?: string
          is_installation?: boolean | null
          is_sale?: boolean | null
          is_urgent?: boolean | null
          is_warranty?: boolean | null
          labor_cost?: number | null
          last_status_before_part_request?: string | null
          model?: string | null
          notes?: string | null
          parts_cost?: number | null
          pending_pricing?: boolean | null
          pickup_date?: string | null
          pricing_description?: string | null
          scheduled_date?: string | null
          scheduled_shift?: string | null
          serial_number?: string | null
          service_address?: string | null
          service_city?: string | null
          service_location?: string | null
          service_postal_code?: string | null
          service_type?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
          warranty_brand?: string | null
          warranty_process_number?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_delivery_technician_id_fkey"
            columns: ["delivery_technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_delivery_technician_id_fkey"
            columns: ["delivery_technician_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["tech_id"]
          },
          {
            foreignKeyName: "services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["tech_id"]
          },
        ]
      }
      technicians: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string
          id: string
          profile_id: string
          specialization: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          id?: string
          profile_id: string
          specialization?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          specialization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      technician_services: {
        Row: {
          appliance_type: string | null
          brand: string | null
          code: string | null
          created_at: string | null
          customer_id: string | null
          delivery_date: string | null
          delivery_method: string | null
          delivery_technician_id: string | null
          detected_fault: string | null
          fault_description: string | null
          id: string | null
          is_installation: boolean | null
          is_sale: boolean | null
          is_urgent: boolean | null
          is_warranty: boolean | null
          last_status_before_part_request: string | null
          model: string | null
          notes: string | null
          pending_pricing: boolean | null
          pickup_date: string | null
          scheduled_date: string | null
          scheduled_shift: string | null
          serial_number: string | null
          service_address: string | null
          service_city: string | null
          service_location: string | null
          service_postal_code: string | null
          service_type: string | null
          status: string | null
          technician_id: string | null
          updated_at: string | null
          warranty_brand: string | null
          warranty_process_number: string | null
          work_performed: string | null
        }
        Insert: {
          appliance_type?: string | null
          brand?: string | null
          code?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          delivery_method?: string | null
          delivery_technician_id?: string | null
          detected_fault?: string | null
          fault_description?: string | null
          id?: string | null
          is_installation?: boolean | null
          is_sale?: boolean | null
          is_urgent?: boolean | null
          is_warranty?: boolean | null
          last_status_before_part_request?: string | null
          model?: string | null
          notes?: string | null
          pending_pricing?: boolean | null
          pickup_date?: string | null
          scheduled_date?: string | null
          scheduled_shift?: string | null
          serial_number?: string | null
          service_address?: string | null
          service_city?: string | null
          service_location?: string | null
          service_postal_code?: string | null
          service_type?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string | null
          warranty_brand?: string | null
          warranty_process_number?: string | null
          work_performed?: string | null
        }
        Update: {
          appliance_type?: string | null
          brand?: string | null
          code?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          delivery_method?: string | null
          delivery_technician_id?: string | null
          detected_fault?: string | null
          fault_description?: string | null
          id?: string | null
          is_installation?: boolean | null
          is_sale?: boolean | null
          is_urgent?: boolean | null
          is_warranty?: boolean | null
          last_status_before_part_request?: string | null
          model?: string | null
          notes?: string | null
          pending_pricing?: boolean | null
          pickup_date?: string | null
          scheduled_date?: string | null
          scheduled_shift?: string | null
          serial_number?: string | null
          service_address?: string | null
          service_city?: string | null
          service_location?: string | null
          service_postal_code?: string | null
          service_type?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string | null
          warranty_brand?: string | null
          warranty_process_number?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_delivery_technician_id_fkey"
            columns: ["delivery_technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_delivery_technician_id_fkey"
            columns: ["delivery_technician_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["tech_id"]
          },
          {
            foreignKeyName: "services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["tech_id"]
          },
        ]
      }
      tv_monitor_services: {
        Row: {
          appliance_type: string | null
          brand: string | null
          code: string | null
          created_at: string | null
          customer_name: string | null
          fault_description: string | null
          id: string | null
          is_urgent: boolean | null
          model: string | null
          service_location: string | null
          status: string | null
          tech_active: boolean | null
          tech_color: string | null
          tech_id: string | null
          tech_name: string | null
          technician_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "tv_monitor_services"
            referencedColumns: ["tech_id"]
          },
        ]
      }
    }
    Functions: {
      can_access_service: {
        Args: { _service_id: string; _user_id: string }
        Returns: boolean
      }
      get_technician_profile_id: { Args: { _user_id: string }; Returns: string }
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
      is_dono: { Args: { _user_id: string }; Returns: boolean }
      is_secretaria: { Args: { _user_id: string }; Returns: boolean }
      is_tecnico: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "dono" | "secretaria" | "tecnico"
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
      app_role: ["dono", "secretaria", "tecnico"],
    },
  },
} as const
