'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { createClient } from '@/lib/supabase/client'
import { Event, Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StreamViewer } from '@/components/jury/stream-viewer'
import { ScoringForm } from '@/components/jury/scoring-form'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function JuryPage() {
  const router = useRouter()
  const { profile, signOut, isLoading: authLoading } = useAuth()
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useRealtimeEvent(currentEvent?.id || null)

  useEffect(() => {
    if (!authLoading && profile?.role !== 'jury') {
      router.push('/login')
      return
    }

    if (profile?.role === 'jury') {
      loadEventData()
    }
  }, [profile, authLoading, router])

  useEffect(() => {
    if (currentEvent?.current_team_id) {
      loadCurrentTeam()
    } else {
      setCurrentTeam(null)
    }
  }, [currentEvent?.current_team_id])

  const loadEventData = async () => {
    setIsLoading(true)

    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (eventData) {
        setCurrentEvent(eventData)
      }
    } catch (error) {
      console.error('Failed to load event data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCurrentTeam = async () => {
    if (!currentEvent?.current_team_id) return

    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', currentEvent.current_team_id)
      .single()

    if (data) setCurrentTeam(data)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (profile?.role !== 'jury') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Jury Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {currentEvent?.name || 'No event selected'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Main Content - Split Screen */}
        <div className="flex-1 overflow-hidden">
          {currentEvent && currentTeam ? (
            <div className="h-full grid md:grid-cols-2 gap-4 p-4 max-w-screen-2xl mx-auto">
              {/* Left: Stream Viewer */}
              <div className="overflow-auto">
                <StreamViewer event={currentEvent} team={currentTeam} />
              </div>

              {/* Right: Scoring Form */}
              <div className="overflow-auto">
                <ScoringForm
                  event={currentEvent}
                  team={currentTeam}
                  juryId={profile.id}
                  onScoreSubmitted={loadEventData}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <Card className="max-w-md w-full">
                <CardHeader>
                  <CardTitle>No Active Pitch</CardTitle>
                  <CardDescription>
                    {currentEvent?.status === 'PITCHING'
                      ? 'The admin needs to select a team and start their pitch timer in the Pitch Control panel.'
                      : currentEvent
                      ? 'Waiting for the pitching phase to begin...'
                      : 'No active event found'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentEvent?.status === 'PITCHING' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                      <p className="font-medium mb-1">Status: PITCHING phase active</p>
                      <p className="text-xs">
                        The event is in pitching phase but no team is currently presenting.
                        The admin can select a team from the Pitch Control panel to begin.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
