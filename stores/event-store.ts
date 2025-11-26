import { create } from 'zustand'
import { Event, Team, EventStatus } from '@/types'

interface EventState {
  currentEvent: Event | null
  currentTeam: Team | null
  allTeams: Team[]
  timerEndTime: Date | null
  setCurrentEvent: (event: Event | null) => void
  setCurrentTeam: (team: Team | null) => void
  setAllTeams: (teams: Team[]) => void
  setTimerEndTime: (time: Date | null) => void
  updateEventStatus: (status: EventStatus) => void
}

export const useEventStore = create<EventState>((set) => ({
  currentEvent: null,
  currentTeam: null,
  allTeams: [],
  timerEndTime: null,
  setCurrentEvent: (currentEvent) => set({ currentEvent }),
  setCurrentTeam: (currentTeam) => set({ currentTeam }),
  setAllTeams: (allTeams) => set({ allTeams }),
  setTimerEndTime: (timerEndTime) => set({ timerEndTime }),
  updateEventStatus: (status) =>
    set((state) => ({
      currentEvent: state.currentEvent
        ? { ...state.currentEvent, status }
        : null,
    })),
}))
