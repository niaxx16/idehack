import { create } from 'zustand'
import { PortfolioVote } from '@/types'

interface VotingState {
  votes: Record<string, number> // team_id -> amount
  isSubmitting: boolean
  addVote: (teamId: string, amount: number) => void
  removeVote: (teamId: string) => void
  updateVote: (teamId: string, amount: number) => void
  clearVotes: () => void
  setSubmitting: (isSubmitting: boolean) => void
  getTotalAllocated: () => number
  getVotesArray: () => PortfolioVote[]
}

export const useVotingStore = create<VotingState>((set, get) => ({
  votes: {},
  isSubmitting: false,
  addVote: (teamId, amount) =>
    set((state) => ({
      votes: { ...state.votes, [teamId]: amount },
    })),
  removeVote: (teamId) =>
    set((state) => {
      const newVotes = { ...state.votes }
      delete newVotes[teamId]
      return { votes: newVotes }
    }),
  updateVote: (teamId, amount) =>
    set((state) => ({
      votes: { ...state.votes, [teamId]: amount },
    })),
  clearVotes: () => set({ votes: {} }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  getTotalAllocated: () => {
    const votes = get().votes
    return Object.values(votes).reduce((sum, amount) => sum + amount, 0)
  },
  getVotesArray: () => {
    const votes = get().votes
    return Object.entries(votes)
      .filter(([, amount]) => amount > 0)
      .map(([team_id, amount]) => ({ team_id, amount }))
  },
}))
