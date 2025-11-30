import { Database } from './database'

// Extract types from Database
export type Event = Database['public']['Tables']['events']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserNote = Database['public']['Tables']['user_notes']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type JuryScore = Database['public']['Tables']['jury_scores']['Row']

// Enums
export type EventStatus = Database['public']['Enums']['event_status']
export type UserRole = Database['public']['Enums']['user_role']

// Canvas data structure
export interface CanvasData {
  problem: string
  solution: string
  target_audience: string
  value_proposition: string
  key_features: string
  revenue_model: string
}

// Mentor types
export interface MentorAssignment {
  id: string
  mentor_id: string
  team_id: string
  assigned_at: string
  created_at: string
  updated_at: string
}

export interface MentorFeedback {
  id: string
  team_id: string
  mentor_id: string
  canvas_section: 'problem' | 'solution' | 'value_proposition' | 'target_audience' | 'key_features' | 'revenue_model'
  feedback_text: string
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface MentorFeedbackWithMentor extends MentorFeedback {
  mentor?: Profile
}

export interface MentorAssignmentWithDetails extends MentorAssignment {
  mentor?: Profile
  team?: Team
}

// Jury scoring structure
export interface JuryScoreData {
  innovation: number
  presentation: number
  feasibility: number
  impact: number
}

// Portfolio vote structure
export interface PortfolioVote {
  team_id: string
  amount: number
}

// Leaderboard entry
export interface LeaderboardEntry {
  team_id: string
  team_name: string
  total_investment: number
  jury_avg_score: number
  final_score: number
}

// Top Investor entry
export interface WinningInvestment {
  team_id: string
  team_name: string
  amount: number
  rank: number
  multiplier: number
}

export interface TopInvestorEntry {
  investor_id: string
  investor_name: string
  investor_team_id: string
  investor_team_name: string
  total_invested: number
  roi_score: number
  winning_investments: WinningInvestment[]
}

// Extended types with relations
export interface TeamWithDetails extends Team {
  event?: Event
  members?: Profile[]
}

export interface ProfileWithTeam extends Profile {
  team?: Team
}

// Hype reaction types (realtime broadcast)
export type HypeReaction = 'clap' | 'fire'

export interface HypeEvent {
  type: HypeReaction
  userId: string
  timestamp: number
}
