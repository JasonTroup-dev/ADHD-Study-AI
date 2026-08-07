export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]


export type StudySessionStatus = "active" | "completed" | "cancelled"
export type StudySessionType =
  | "assignment"
  | "flashcards"
  | "practice_quiz"
  | "general_study"

export type StudySessionMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  completionStatus?: "in_progress" | "ready"
  completionReason?: string
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assignment_files: {
        Row: {
          ai_summary: string | null
          assignment_id: string | null
          class_id: string
          created_at: string
          extracted_text: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          assignment_id?: string | null
          class_id: string
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          assignment_id?: string | null
          class_id?: string
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_files_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_files_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_materials: {
        Row: {
          assignment_id: string
          created_at: string
          extracted_text: string | null
          file_size_bytes: number
          file_type: string
          id: string
          original_file_name: string
          storage_path: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          extracted_text?: string | null
          file_size_bytes: number
          file_type: string
          id?: string
          original_file_name: string
          storage_path: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          extracted_text?: string | null
          file_size_bytes?: number
          file_type?: string
          id?: string
          original_file_name?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_materials_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          class_id: string | null
          context_status: string
          context_version: number
          created_at: string | null
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          extracted_text: string | null
          file_size_bytes: number | null
          file_type: string | null
          id: string
          importance: string
          original_file_name: string | null
          points: number | null
          priority: string | null
          status: string
          storage_path: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          class_id?: string | null
          context_status?: string
          context_version?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          extracted_text?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          importance?: string
          original_file_name?: string | null
          points?: number | null
          priority?: string | null
          status?: string
          storage_path?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          class_id?: string | null
          context_status?: string
          context_version?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          extracted_text?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          importance?: string
          original_file_name?: string | null
          points?: number | null
          priority?: string | null
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_code: string | null
          color: string | null
          created_at: string | null
          id: string
          name: string
          num_sessions: number | null
          prof_name: string | null
          user_id: string
        }
        Insert: {
          class_code?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          num_sessions?: number | null
          prof_name?: string | null
          user_id: string
        }
        Update: {
          class_code?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          num_sessions?: number | null
          prof_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcard_sets: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          created_at: string
          description: string | null
          id: string
          session_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          session_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          session_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_sets_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_sets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer: string
          card_order: number | null
          created_at: string | null
          id: string
          last_reviewed_at: string | null
          mastery_level: number
          question: string
          set_id: string
          times_correct: number
          times_seen: number
        }
        Insert: {
          answer: string
          card_order?: number | null
          created_at?: string | null
          id?: string
          last_reviewed_at?: string | null
          mastery_level?: number
          question: string
          set_id: string
          times_correct?: number
          times_seen?: number
        }
        Update: {
          answer?: string
          card_order?: number | null
          created_at?: string | null
          id?: string
          last_reviewed_at?: string | null
          mastery_level?: number
          question?: string
          set_id?: string
          times_correct?: number
          times_seen?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          actual_minutes: number | null
          assignment_id: string | null
          class_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          planned_minutes: number | null
          session_type: string
          started_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number | null
          session_type?: string
          started_at?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number | null
          session_type?: string
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          assignment_id: string | null
          class_id: string
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          session_id: string | null
          source_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          class_id: string
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          session_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          class_id?: string
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          session_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_guides: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          content: string
          created_at: string
          id: string
          source_file_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          class_id?: string | null
          content: string
          created_at?: string
          id?: string
          source_file_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          class_id?: string | null
          content?: string
          created_at?: string
          id?: string
          source_file_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_guides_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_guides_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_guides_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "assignment_files"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_tasks: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          completed_at: string | null
          context_version: number
          created_at: string
          description: string | null
          end_time: string | null
          estimated_minutes: number | null
          id: string
          priority: string | null
          scheduled_date: string
          source: string
          start_time: string | null
          status: string
          title: string
          user_edited: boolean
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          class_id?: string | null
          completed_at?: string | null
          context_version?: number
          created_at?: string
          description?: string | null
          end_time?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string | null
          scheduled_date: string
          source?: string
          start_time?: string | null
          status?: string
          title: string
          user_edited?: boolean
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          class_id?: string | null
          completed_at?: string | null
          context_version?: number
          created_at?: string
          description?: string | null
          end_time?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string | null
          scheduled_date?: string
          source?: string
          start_time?: string | null
          status?: string
          title?: string
          user_edited?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_tasks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_session_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          actual_minutes: number | null
          assignment_id: string | null
          class_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          messages: StudySessionMessage[]
          planned_minutes: number | null
          session_type: StudySessionType
          started_at: string
          status: StudySessionStatus
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          messages?: StudySessionMessage[]
          planned_minutes?: number | null
          session_type?: StudySessionType
          started_at?: string
          status?: StudySessionStatus
          summary?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          messages?: StudySessionMessage[]
          planned_minutes?: number | null
          session_type?: StudySessionType
          started_at?: string
          status?: StudySessionStatus
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const

export type StudySession = Tables<"study_sessions">
export type StudySessionInsert = TablesInsert<"study_sessions">
export type StudySessionUpdate = TablesUpdate<"study_sessions">
