import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEventStore } from '@/stores/event-store'
import { Event } from '@/types'

export function useRealtimeEvent(eventId: string | null) {
  const { setCurrentEvent, setCurrentTeam } = useEventStore()
  const supabase = createClient()

  useEffect(() => {
    if (!eventId) return

    // Initial fetch
    supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentEvent(data)

          // Fetch current team if exists
          if (data.current_team_id) {
            supabase
              .from('teams')
              .select('*')
              .eq('id', data.current_team_id)
              .single()
              .then(({ data: teamData }) => {
                if (teamData) setCurrentTeam(teamData)
              })
          }
        }
      })

    // Subscribe to changes
    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        async (payload) => {
          const updatedEvent = payload.new as Event

          setCurrentEvent(updatedEvent)

          // Update current team if changed
          if (updatedEvent.current_team_id) {
            const { data: teamData } = await supabase
              .from('teams')
              .select('*')
              .eq('id', updatedEvent.current_team_id)
              .single()

            if (teamData) setCurrentTeam(teamData)
          } else {
            setCurrentTeam(null)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId, supabase, setCurrentEvent, setCurrentTeam])
}
