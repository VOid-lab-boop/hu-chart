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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string
          procedure: string | null
          scheduled_at: string
          status: string | null
          student_id: string | null
          supervisor_id: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          procedure?: string | null
          scheduled_at: string
          status?: string | null
          student_id?: string | null
          supervisor_id?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          procedure?: string | null
          scheduled_at?: string
          status?: string | null
          student_id?: string | null
          supervisor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      indices_records: {
        Row: {
          bleeding_index_percentage: number | null
          bleeding_risk_level: string | null
          chart_id: string
          gingival_index_interpretation: string | null
          gingival_index_score: number | null
          id: string
          ohis_ci: number | null
          ohis_di: number | null
          ohis_total: number | null
          oleary_percentage: number | null
          plaque_index_interpretation: string | null
          plaque_index_score: number | null
          raw_data: Json | null
          updated_at: string
        }
        Insert: {
          bleeding_index_percentage?: number | null
          bleeding_risk_level?: string | null
          chart_id: string
          gingival_index_interpretation?: string | null
          gingival_index_score?: number | null
          id?: string
          ohis_ci?: number | null
          ohis_di?: number | null
          ohis_total?: number | null
          oleary_percentage?: number | null
          plaque_index_interpretation?: string | null
          plaque_index_score?: number | null
          raw_data?: Json | null
          updated_at?: string
        }
        Update: {
          bleeding_index_percentage?: number | null
          bleeding_risk_level?: string | null
          chart_id?: string
          gingival_index_interpretation?: string | null
          gingival_index_score?: number | null
          id?: string
          ohis_ci?: number | null
          ohis_di?: number | null
          ohis_total?: number | null
          oleary_percentage?: number | null
          plaque_index_interpretation?: string | null
          plaque_index_score?: number | null
          raw_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indices_records_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: true
            referencedRelation: "periodontal_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          chief_complaint: string | null
          created_at: string
          created_by: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          medical_history: string | null
          medications: string | null
          notes: string | null
          patient_code: string
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          chief_complaint?: string | null
          created_at?: string
          created_by: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          medical_history?: string | null
          medications?: string | null
          notes?: string | null
          patient_code?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          medical_history?: string | null
          medications?: string | null
          notes?: string | null
          patient_code?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      periodontal_charts: {
        Row: {
          approved_at: string | null
          chart_date: string
          created_at: string
          created_by: string
          general_notes: string | null
          id: string
          patient_id: string
          status: Database["public"]["Enums"]["case_status"]
          supervisor_id: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          approved_at?: string | null
          chart_date?: string
          created_at?: string
          created_by: string
          general_notes?: string | null
          id?: string
          patient_id: string
          status?: Database["public"]["Enums"]["case_status"]
          supervisor_id?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          approved_at?: string | null
          chart_date?: string
          created_at?: string
          created_by?: string
          general_notes?: string | null
          id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["case_status"]
          supervisor_id?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodontal_charts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodontal_charts_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          university_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          university_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      radiographs: {
        Row: {
          bone_level_mm: number | null
          bone_loss_pattern:
            | Database["public"]["Enums"]["bone_loss_pattern"]
            | null
          calculus_notes: string | null
          chart_id: string | null
          created_at: string
          crown_root_ratio: string | null
          furcation_radiolucency: boolean | null
          id: string
          image_url: string
          notes: string | null
          patient_id: string
          taken_on: string | null
          uploaded_by: string
        }
        Insert: {
          bone_level_mm?: number | null
          bone_loss_pattern?:
            | Database["public"]["Enums"]["bone_loss_pattern"]
            | null
          calculus_notes?: string | null
          chart_id?: string | null
          created_at?: string
          crown_root_ratio?: string | null
          furcation_radiolucency?: boolean | null
          id?: string
          image_url: string
          notes?: string | null
          patient_id: string
          taken_on?: string | null
          uploaded_by: string
        }
        Update: {
          bone_level_mm?: number | null
          bone_loss_pattern?:
            | Database["public"]["Enums"]["bone_loss_pattern"]
            | null
          calculus_notes?: string | null
          chart_id?: string | null
          created_at?: string
          crown_root_ratio?: string | null
          furcation_radiolucency?: boolean | null
          id?: string
          image_url?: string
          notes?: string | null
          patient_id?: string
          taken_on?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "radiographs_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "periodontal_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiographs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          chart_id: string
          comments: string | null
          id: string
          signed_at: string
          supervisor_id: string
        }
        Insert: {
          chart_id: string
          comments?: string | null
          id?: string
          signed_at?: string
          supervisor_id: string
        }
        Update: {
          chart_id?: string
          comments?: string | null
          id?: string
          signed_at?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "periodontal_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_measurements: {
        Row: {
          bop_b: boolean | null
          bop_db: boolean | null
          bop_dl: boolean | null
          bop_l: boolean | null
          bop_mb: boolean | null
          bop_ml: boolean | null
          chart_id: string
          furcation_buccal: number | null
          furcation_distal: number | null
          furcation_lingual: number | null
          furcation_mesial: number | null
          gm_b: number | null
          gm_db: number | null
          gm_dl: number | null
          gm_l: number | null
          gm_mb: number | null
          gm_ml: number | null
          id: string
          is_missing: boolean
          mobility: number | null
          notes: string | null
          pd_b: number | null
          pd_db: number | null
          pd_dl: number | null
          pd_l: number | null
          pd_mb: number | null
          pd_ml: number | null
          plaque_b: boolean | null
          plaque_db: boolean | null
          plaque_dl: boolean | null
          plaque_l: boolean | null
          plaque_mb: boolean | null
          plaque_ml: boolean | null
          supp_b: boolean | null
          supp_db: boolean | null
          supp_dl: boolean | null
          supp_l: boolean | null
          supp_mb: boolean | null
          supp_ml: boolean | null
          tooth_number: number
          updated_at: string
        }
        Insert: {
          bop_b?: boolean | null
          bop_db?: boolean | null
          bop_dl?: boolean | null
          bop_l?: boolean | null
          bop_mb?: boolean | null
          bop_ml?: boolean | null
          chart_id: string
          furcation_buccal?: number | null
          furcation_distal?: number | null
          furcation_lingual?: number | null
          furcation_mesial?: number | null
          gm_b?: number | null
          gm_db?: number | null
          gm_dl?: number | null
          gm_l?: number | null
          gm_mb?: number | null
          gm_ml?: number | null
          id?: string
          is_missing?: boolean
          mobility?: number | null
          notes?: string | null
          pd_b?: number | null
          pd_db?: number | null
          pd_dl?: number | null
          pd_l?: number | null
          pd_mb?: number | null
          pd_ml?: number | null
          plaque_b?: boolean | null
          plaque_db?: boolean | null
          plaque_dl?: boolean | null
          plaque_l?: boolean | null
          plaque_mb?: boolean | null
          plaque_ml?: boolean | null
          supp_b?: boolean | null
          supp_db?: boolean | null
          supp_dl?: boolean | null
          supp_l?: boolean | null
          supp_mb?: boolean | null
          supp_ml?: boolean | null
          tooth_number: number
          updated_at?: string
        }
        Update: {
          bop_b?: boolean | null
          bop_db?: boolean | null
          bop_dl?: boolean | null
          bop_l?: boolean | null
          bop_mb?: boolean | null
          bop_ml?: boolean | null
          chart_id?: string
          furcation_buccal?: number | null
          furcation_distal?: number | null
          furcation_lingual?: number | null
          furcation_mesial?: number | null
          gm_b?: number | null
          gm_db?: number | null
          gm_dl?: number | null
          gm_l?: number | null
          gm_mb?: number | null
          gm_ml?: number | null
          id?: string
          is_missing?: boolean
          mobility?: number | null
          notes?: string | null
          pd_b?: number | null
          pd_db?: number | null
          pd_dl?: number | null
          pd_l?: number | null
          pd_mb?: number | null
          pd_ml?: number | null
          plaque_b?: boolean | null
          plaque_db?: boolean | null
          plaque_dl?: boolean | null
          plaque_l?: boolean | null
          plaque_mb?: boolean | null
          plaque_ml?: boolean | null
          supp_b?: boolean | null
          supp_db?: boolean | null
          supp_dl?: boolean | null
          supp_l?: boolean | null
          supp_mb?: boolean | null
          supp_ml?: boolean | null
          tooth_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooth_measurements_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "periodontal_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          chart_id: string | null
          completed_date: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          patient_id: string
          priority: number | null
          procedure: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["treatment_status"]
          tooth_number: number | null
          updated_at: string
        }
        Insert: {
          chart_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          patient_id: string
          priority?: number | null
          procedure: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["treatment_status"]
          tooth_number?: number | null
          updated_at?: string
        }
        Update: {
          chart_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: number | null
          procedure?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["treatment_status"]
          tooth_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "periodontal_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      visits: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          patient_id: string
          supervisor_id: string | null
          visit_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          patient_id: string
          supervisor_id?: string | null
          visit_date?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          patient_id?: string
          supervisor_id?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email_from_university_id: { Args: { _uid: string }; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
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
      app_role: "admin" | "supervisor" | "student"
      bone_loss_pattern: "horizontal" | "vertical" | "mixed" | "none"
      case_status: "draft" | "pending_review" | "approved" | "completed"
      gender_type: "male" | "female" | "other"
      treatment_status: "planned" | "in_progress" | "completed" | "cancelled"
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
      app_role: ["admin", "supervisor", "student"],
      bone_loss_pattern: ["horizontal", "vertical", "mixed", "none"],
      case_status: ["draft", "pending_review", "approved", "completed"],
      gender_type: ["male", "female", "other"],
      treatment_status: ["planned", "in_progress", "completed", "cancelled"],
    },
  },
} as const
