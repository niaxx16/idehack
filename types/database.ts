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
      events: {
        Row: {
          id: string
          name: string
          status: 'WAITING' | 'IDEATION' | 'LOCKED' | 'PITCHING' | 'VOTING' | 'COMPLETED'
          current_team_id: string | null
          stream_url: string | null
          pitch_timer_end: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: 'WAITING' | 'IDEATION' | 'LOCKED' | 'PITCHING' | 'VOTING' | 'COMPLETED'
          current_team_id?: string | null
          stream_url?: string | null
          pitch_timer_end?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'WAITING' | 'IDEATION' | 'LOCKED' | 'PITCHING' | 'VOTING' | 'COMPLETED'
          current_team_id?: string | null
          stream_url?: string | null
          pitch_timer_end?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_current_team_id_fkey"
            columns: ["current_team_id"]
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
          canvas_data: {
            problem: string
            solution: string
            target_audience: string
            revenue_model: string
          }
          presentation_url: string | null
          total_investment: number
          pitch_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          table_number: number
          access_token?: string
          canvas_data?: {
            problem: string
            solution: string
            target_audience: string
            revenue_model: string
          }
          presentation_url?: string | null
          total_investment?: number
          pitch_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          table_number?: number
          access_token?: string
          canvas_data?: {
            problem: string
            solution: string
            target_audience: string
            revenue_model: string
          }
          presentation_url?: string | null
          total_investment?: number
          pitch_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          full_name: string | null
          email: string | null
          event_id: string | null
          personal_code: string | null
          display_password: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'student' | 'jury' | 'admin' | 'mentor'
          team_id?: string | null
          wallet_balance?: number
          display_name?: string | null
          full_name?: string | null
          email?: string | null
          event_id?: string | null
          personal_code?: string | null
          display_password?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'student' | 'jury' | 'admin' | 'mentor'
          team_id?: string | null
          wallet_balance?: number
          display_name?: string | null
          full_name?: string | null
          email?: string | null
          event_id?: string | null
          personal_code?: string | null
          display_password?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
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
      jury_scores: {
        Row: {
          id: string
          jury_id: string
          team_id: string
          scores: {
            innovation: number
            presentation: number
            feasibility: number
            impact: number
          }
          comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          jury_id: string
          team_id: string
          scores?: {
            innovation: number
            presentation: number
            feasibility: number
            impact: number
          }
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          jury_id?: string
          team_id?: string
          scores?: {
            innovation: number
            presentation: number
            feasibility: number
            impact: number
          }
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_team_by_token: {
        Args: {
          access_token_input: string
        }
        Returns: Json
      }
      submit_portfolio: {
        Args: {
          votes: Json
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
    }
    Enums: {
      event_status: 'WAITING' | 'IDEATION' | 'LOCKED' | 'PITCHING' | 'VOTING' | 'COMPLETED'
      user_role: 'student' | 'jury' | 'admin'
    }
  }
}
