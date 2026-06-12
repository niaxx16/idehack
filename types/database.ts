// Auto-generated from the live Supabase schema. Do not edit by hand.
// Regenerate with: node scripts/generate-database-types.mjs

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      canvas_contributions: {
        Row: {
          id: string
          team_id: string
          user_id: string
          section: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          section: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          section?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvas_contributions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          name: string
          status: 'WAITING' | 'IDEATION' | 'LOCKED' | 'PITCHING' | 'VOTING' | 'COMPLETED'
          current_team_id: string | null
          stream_url: string | null
          pitch_timer_end: string | null
          created_at: string
          updated_at: string
          description: string | null
          language: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          status?: 'WAITING' | 'IDEATION' | 'LOCKED' | 'PITCHING' | 'VOTING' | 'COMPLETED'
          current_team_id?: string | null
          stream_url?: string | null
          pitch_timer_end?: string | null
          created_at?: string
          updated_at?: string
          description?: string | null
          language?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          status?: 'WAITING' | 'IDEATION' | 'LOCKED' | 'PITCHING' | 'VOTING' | 'COMPLETED'
          current_team_id?: string | null
          stream_url?: string | null
          pitch_timer_end?: string | null
          created_at?: string
          updated_at?: string
          description?: string | null
          language?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      jury_scores: {
        Row: {
          id: string
          jury_id: string
          team_id: string
          scores: Json
          comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          jury_id: string
          team_id: string
          scores: Json
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          jury_id?: string
          team_id?: string
          scores?: Json
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_scores_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      mentor_assignments: {
        Row: {
          id: string
          mentor_id: string
          team_id: string
          assigned_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          mentor_id: string
          team_id: string
          assigned_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          mentor_id?: string
          team_id?: string
          assigned_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_assignments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      mentor_evaluations: {
        Row: {
          id: string
          team_id: string
          mentor_id: string
          evaluation_text: string
          project_paths: string[]
          project_path_reasoning: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          mentor_id: string
          evaluation_text?: string
          project_paths: string[]
          project_path_reasoning?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          mentor_id?: string
          evaluation_text?: string
          project_paths?: string[]
          project_path_reasoning?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_evaluations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_evaluations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      mentor_feedback: {
        Row: {
          id: string
          team_id: string
          mentor_id: string
          canvas_section: string
          feedback_text: string
          is_read: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          mentor_id: string
          canvas_section: string
          feedback_text: string
          is_read?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          mentor_id?: string
          canvas_section?: string
          feedback_text?: string
          is_read?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_feedback_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_feedback_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          role: 'student' | 'jury' | 'admin' | 'mentor'
          team_id: string | null
          wallet_balance: number
          display_name: string | null
          created_at: string
          updated_at: string
          full_name: string | null
          email: string | null
          expiration_date: string | null
          is_super_admin: boolean | null
          event_id: string | null
          personal_code: string | null
          display_password: string | null
        }
        Insert: {
          id: string
          role?: 'student' | 'jury' | 'admin' | 'mentor'
          team_id?: string | null
          wallet_balance?: number
          display_name?: string | null
          created_at?: string
          updated_at?: string
          full_name?: string | null
          email?: string | null
          expiration_date?: string | null
          is_super_admin?: boolean | null
          event_id?: string | null
          personal_code?: string | null
          display_password?: string | null
        }
        Update: {
          id?: string
          role?: 'student' | 'jury' | 'admin' | 'mentor'
          team_id?: string | null
          wallet_balance?: number
          display_name?: string | null
          created_at?: string
          updated_at?: string
          full_name?: string | null
          email?: string | null
          expiration_date?: string | null
          is_super_admin?: boolean | null
          event_id?: string | null
          personal_code?: string | null
          display_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      team_decisions: {
        Row: {
          id: string
          team_id: string
          section: string
          content: string
          updated_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          section: string
          content: string
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          section?: string
          content?: string
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_decisions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_decisions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      team_tracking: {
        Row: {
          id: string
          team_id: string
          project_path: string | null
          project_path_other: string | null
          incubation_status: string | null
          incubation_start_date: string | null
          incubation_end_date: string | null
          incubation_notes: string | null
          supporting_experts: string | null
          application_submitted: boolean | null
          application_date: string | null
          application_result: string | null
          result_notes: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          consortium_demoday: string | null
          collaborator_support: string | null
          support_type: string | null
        }
        Insert: {
          id?: string
          team_id: string
          project_path?: string | null
          project_path_other?: string | null
          incubation_status?: string | null
          incubation_start_date?: string | null
          incubation_end_date?: string | null
          incubation_notes?: string | null
          supporting_experts?: string | null
          application_submitted?: boolean | null
          application_date?: string | null
          application_result?: string | null
          result_notes?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          consortium_demoday?: string | null
          collaborator_support?: string | null
          support_type?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          project_path?: string | null
          project_path_other?: string | null
          incubation_status?: string | null
          incubation_start_date?: string | null
          incubation_end_date?: string | null
          incubation_notes?: string | null
          supporting_experts?: string | null
          application_submitted?: boolean | null
          application_date?: string | null
          application_result?: string | null
          result_notes?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          consortium_demoday?: string | null
          collaborator_support?: string | null
          support_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_tracking_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          event_id: string
          name: string
          table_number: number
          access_token: string
          canvas_data: Json | null
          presentation_url: string | null
          total_investment: number | null
          pitch_order: number | null
          created_at: string
          updated_at: string
          activation_code: string | null
          is_activated: boolean | null
          team_members: Json | null
          captain_id: string | null
          school_name: string | null
          advisor_teacher: string | null
          advisor_phone: string | null
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          table_number: number
          access_token?: string
          canvas_data?: Json | null
          presentation_url?: string | null
          total_investment?: number | null
          pitch_order?: number | null
          created_at?: string
          updated_at?: string
          activation_code?: string | null
          is_activated?: boolean | null
          team_members?: Json | null
          captain_id?: string | null
          school_name?: string | null
          advisor_teacher?: string | null
          advisor_phone?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          table_number?: number
          access_token?: string
          canvas_data?: Json | null
          presentation_url?: string | null
          total_investment?: number | null
          pitch_order?: number | null
          created_at?: string
          updated_at?: string
          activation_code?: string | null
          is_activated?: boolean | null
          team_members?: Json | null
          captain_id?: string | null
          school_name?: string | null
          advisor_teacher?: string | null
          advisor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          sender_id: string
          receiver_team_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_team_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_team_id?: string
          amount?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_receiver_team_id_fkey"
            columns: ["receiver_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      user_notes: {
        Row: {
          id: string
          user_id: string
          target_team_id: string
          note_text: string | null
          temp_rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_team_id: string
          note_text?: string | null
          temp_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_team_id?: string
          note_text?: string | null
          temp_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notes_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_canvas_contribution: {
        Args: {
          content_input: string
          section_input: string
        }
        Returns: Json
      }
      generate_personal_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_team_report_card: {
        Args: {
          team_id_input: string
        }
        Returns: Json
      }
      get_leaderboard: {
        Args: {
          event_id_input: string
        }
        Returns: {
          team_id: string
          team_name: string
          total_investment: number
          jury_avg_score: number
          final_score: number
        }[]
      }
      get_top_investors: {
        Args: {
          event_id_input: string
        }
        Returns: {
          investor_id: string
          investor_name: string
          investor_team_id: string
          investor_team_name: string
          total_invested: number
          roi_score: number
          winning_investments: Json
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      join_team_by_code: {
        Args: {
          activation_code_input: string
          member_name: string
          member_role: string
        }
        Returns: Json
      }
      join_team_by_token: {
        Args: {
          access_token_input: string
        }
        Returns: Json
      }
      rejoin_with_personal_code: {
        Args: {
          personal_code_input: string
        }
        Returns: Json
      }
      setup_team_name: {
        Args: {
          new_team_name: string
          team_id_input: string
        }
        Returns: boolean
      }
      submit_portfolio: {
        Args: {
          votes: Json
        }
        Returns: Json
      }
      tmp_ping: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      event_status: 'WAITING' | 'IDEATION' | 'LOCKED' | 'PITCHING' | 'VOTING' | 'COMPLETED'
      user_role: 'student' | 'jury' | 'admin' | 'mentor'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
