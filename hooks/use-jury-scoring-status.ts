'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface JuryScoringStatusEntry {
  id: string
  name: string
  scored: boolean
}

export interface JuryScoringStatus {
  juries: JuryScoringStatusEntry[]
  scoredCount: number
  total: number
  allScored: boolean
  isLoading: boolean
}

const EMPTY_STATUS: JuryScoringStatus = {
  juries: [],
  scoredCount: 0,
  total: 0,
  allScored: false,
  isLoading: false,
}

export function useJuryScoringStatus(
  eventId: string | null,
  teamId: string | null
): JuryScoringStatus {
  const [juries, setJuries] = useState<{ id: string; name: string }[]>([])
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Load jury list for the event
  useEffect(() => {
    if (!eventId || !teamId) {
      setJuries([])
      return
    }

    let active = true
    const loadJuries = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .eq('role', 'jury')
        .or(`event_id.is.null,event_id.eq.${eventId}`)

      if (!active) return
      if (error) {
        console.error('Failed to load juries:', error)
        setJuries([])
        return
      }

      const mapped = (data || []).map((p: { id: string; display_name: string | null; full_name: string | null }) => ({
        id: p.id,
        name: p.display_name || p.full_name || 'Jüri',
      }))
      mapped.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      setJuries(mapped)
    }

    loadJuries()
    return () => {
      active = false
    }
  }, [eventId, teamId, supabase])

  // Load who has scored the current team, with realtime updates
  useEffect(() => {
    if (!teamId) {
      setScoredIds(new Set())
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)

    const loadScored = async () => {
      const { data, error } = await supabase
        .from('jury_scores')
        .select('jury_id')
        .eq('team_id', teamId)

      if (!active) return
      if (error) {
        console.error('Failed to load jury scores:', error)
      } else {
        setScoredIds(new Set((data || []).map((row: { jury_id: string }) => row.jury_id)))
      }
      setIsLoading(false)
    }

    loadScored()

    const channel = supabase
      .channel(`admin-jury-status-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jury_scores',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          loadScored()
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [teamId, supabase])

  if (!eventId || !teamId) {
    return EMPTY_STATUS
  }

  const entries: JuryScoringStatusEntry[] = juries.map((j) => ({
    id: j.id,
    name: j.name,
    scored: scoredIds.has(j.id),
  }))
  const scoredCount = entries.filter((e) => e.scored).length
  const total = entries.length

  return {
    juries: entries,
    scoredCount,
    total,
    allScored: total > 0 && scoredCount === total,
    isLoading,
  }
}
