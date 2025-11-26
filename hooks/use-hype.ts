import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HypeEvent, HypeReaction } from '@/types'

export function useHype(eventId: string | null) {
  const [hypeEvents, setHypeEvents] = useState<HypeEvent[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`hype:${eventId}`)
      .on('broadcast', { event: 'hype' }, (payload) => {
        const hypeEvent = payload.payload as HypeEvent

        // Add to list and auto-remove after animation
        setHypeEvents((prev) => [...prev, hypeEvent])

        setTimeout(() => {
          setHypeEvents((prev) => prev.filter((e) => e.timestamp !== hypeEvent.timestamp))
        }, 3000) // Remove after 3 seconds
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId, supabase])

  const sendHype = async (type: HypeReaction, userId: string) => {
    if (!eventId) return

    const hypeEvent: HypeEvent = {
      type,
      userId,
      timestamp: Date.now(),
    }

    const channel = supabase.channel(`hype:${eventId}`)
    await channel.send({
      type: 'broadcast',
      event: 'hype',
      payload: hypeEvent,
    })
  }

  return {
    hypeEvents,
    sendHype,
  }
}
