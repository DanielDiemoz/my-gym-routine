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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      circle_messages: {
        Row: {
          circle_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          circle_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_messages_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string | null
          last_read_at: string
          nickname: string | null
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string
          nickname?: string | null
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string
          nickname?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          id: string
          muscle_group: string
          name: string
          name_search: unknown
        }
        Insert: {
          id?: string
          muscle_group: string
          name: string
          name_search?: unknown
        }
        Update: {
          id?: string
          muscle_group?: string
          name?: string
          name_search?: unknown
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          exercise_library_id: string | null
          id: string
          muscle_group: string | null
          name: string
          notes: string | null
          plan_id: string
          position: number
          reps: number
          sets: number
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          exercise_library_id?: string | null
          id?: string
          muscle_group?: string | null
          name: string
          notes?: string | null
          plan_id: string
          position?: number
          reps?: number
          sets?: number
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          exercise_library_id?: string | null
          id?: string
          muscle_group?: string | null
          name?: string
          notes?: string | null
          plan_id?: string
          position?: number
          reps?: number
          sets?: number
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercises_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarded: boolean | null
          role: string | null
          updated_at: string
          weight_kg: number | null
          weekly_goal: number | null
          weight_unit: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarded?: boolean | null
          role?: string | null
          updated_at?: string
          weight_kg?: number | null
          weekly_goal?: number | null
          weight_unit?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded?: boolean | null
          role?: string | null
          updated_at?: string
          weight_kg?: number | null
          weekly_goal?: number | null
          weight_unit?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          muscle_group: string | null
          reps: number
          session_id: string
          set_number: number
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          muscle_group?: string | null
          reps: number
          session_id: string
          set_number: number
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          muscle_group?: string | null
          reps?: number
          session_id?: string
          set_number?: number
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          id: string
          plan_id: string | null
          plan_name: string | null
          started_at: string
          total_volume: number
          user_id: string
          workout_state: Json | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          plan_id?: string | null
          plan_name?: string | null
          started_at?: string
          total_volume?: number
          user_id: string
          workout_state?: Json | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          plan_id?: string | null
          plan_name?: string | null
          started_at?: string
          total_volume?: number
          user_id?: string
          workout_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_orphaned_sessions: { Args: never; Returns: undefined }
      create_circle: {
        Args: { circle_name: string }
        Returns: {
          code: string
          created_at: string | null
          id: string
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "circles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_circle_code: { Args: never; Returns: string }
      get_circle_by_id: {
        Args: { p_circle_id: string }
        Returns: {
          code: string
          created_at: string
          id: string
          name: string
          owner_id: string
        }[]
      }
      get_circle_members: {
        Args: { p_circle_id: string }
        Returns: {
          user_id: string
          nickname: string | null
        }[]
      }
      get_my_circle_ids: { Args: never; Returns: string[] }
      get_my_circles: {
        Args: never
        Returns: {
          code: string
          created_at: string
          id: string
          member_count: number
          name: string
          owner_id: string
        }[]
      }
      join_circle_by_code: { Args: { invite_code: string }; Returns: string }
      get_circle_messages: {
        Args: { p_circle_id: string }
        Returns: {
          id: string
          circle_id: string
          user_id: string
          content: string
          created_at: string
          display_name: string | null
          avatar_url: string | null
        }[]
      }
      get_unread_count: {
        Args: { p_circle_id: string }
        Returns: number
      }
      mark_circle_read: { Args: { p_circle_id: string }; Returns: undefined }
      remove_circle_member: { Args: { p_circle_id: string; p_member_id: string }; Returns: undefined }
      send_circle_message: {
        Args: { p_circle_id: string; p_content: string }
        Returns: {
          id: string
          circle_id: string
          user_id: string
          content: string
          created_at: string
          display_name: string | null
          avatar_url: string | null
        }[]
      }
      update_circle_member_nickname: {
        Args: { p_circle_id: string; p_member_id: string; p_nickname: string }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
