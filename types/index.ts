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
  revenue_model: string
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
