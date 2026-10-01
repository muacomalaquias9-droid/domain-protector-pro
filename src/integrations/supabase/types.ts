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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name?: string
          prefix: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_domains: {
        Row: {
          created_at: string
          domain: string
          reason: string
          reports: number
          spam_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          reason: string
          reports?: number
          spam_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          reason?: string
          reports?: number
          spam_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      hosted_sites: {
        Row: {
          created_at: string
          custom_domain: string | null
          deploys: number
          domain_verified: boolean
          id: string
          name: string
          slug: string
          storage_used: number
          user_id: string
          verify_token: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          deploys?: number
          domain_verified?: boolean
          id?: string
          name: string
          slug: string
          storage_used?: number
          user_id: string
          verify_token?: string
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          deploys?: number
          domain_verified?: boolean
          id?: string
          name?: string
          slug?: string
          storage_used?: number
          user_id?: string
          verify_token?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string
          reason: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip: string
          reason?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string
          reason?: string | null
          success?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          birth_date: string | null
          company_name: string
          created_at: string
          doc_number: string
          doc_type: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          age?: number | null
          birth_date?: string | null
          company_name?: string
          created_at?: string
          doc_number?: string
          doc_type?: string
          email?: string
          full_name?: string
          id: string
        }
        Update: {
          age?: number | null
          birth_date?: string | null
          company_name?: string
          created_at?: string
          doc_number?: string
          doc_type?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          abuse_email: string | null
          category: string
          created_at: string
          description: string
          domain: string
          id: string
          registrar: string | null
          status: string
          url: string
          user_id: string
        }
        Insert: {
          abuse_email?: string | null
          category: string
          created_at?: string
          description: string
          domain: string
          id?: string
          registrar?: string | null
          status?: string
          url: string
          user_id: string
        }
        Update: {
          abuse_email?: string | null
          category?: string
          created_at?: string
          description?: string
          domain?: string
          id?: string
          registrar?: string | null
          status?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          created_at: string
          id: string
          result: Json
          score: number
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result?: Json
          score?: number
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result?: Json
          score?: number
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      site_files: {
        Row: {
          content_type: string
          id: string
          path: string
          site_id: string
          size: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content_type?: string
          id?: string
          path: string
          site_id: string
          size?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content_type?: string
          id?: string
          path?: string
          site_id?: string
          size?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_files_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "hosted_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions_ip: {
        Row: {
          country: string | null
          ip: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          ip: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          ip?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
