'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { createClient } from '@/lib/supabase/client'
import { Event, Team, Profile } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PitchViewer } from '@/components/student/pitch-viewer'
import { NotesManager } from '@/components/student/notes-manager'
import { PortfolioVoting } from '@/components/student/portfolio-voting'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function StudentPage() {
  const router = useRouter()
  const { profile, signOut, isLoading: authLoading } = useAuth()
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useRealtimeEvent(currentEvent?.id || null)

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login')
      return
    }

    if (profile) {
      loadEventData()
    }
  }, [profile, authLoading, router])

  const loadEventData = async () => {
    setIsLoading(true)

    try {
      // Load the current event
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

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const canVote = currentEvent?.status === 'VOTING'
  const isPitching = currentEvent?.status === 'PITCHING'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Student View</h1>
            <p className="text-sm text-muted-foreground">
              {profile.display_name || 'Anonymous User'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {!currentEvent ? (
          <Card>
            <CardHeader>
              <CardTitle>No Active Event</CardTitle>
              <CardDescription>Please wait for the event to start</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {isPitching && (
              <Tabs defaultValue="pitch" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pitch">Current Pitch</TabsTrigger>
                  <TabsTrigger value="notes">My Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="pitch">
                  <PitchViewer event={currentEvent} />
                </TabsContent>

                <TabsContent value="notes">
                  <NotesManager event={currentEvent} />
                </TabsContent>
              </Tabs>
            )}

            {canVote && (
              <PortfolioVoting event={currentEvent} profile={profile} />
            )}

            {!isPitching && !canVote && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Status: {currentEvent.status}</CardTitle>
                  <CardDescription>
                    {currentEvent.status === 'WAITING' && 'Waiting for the event to start...'}
                    {currentEvent.status === 'IDEATION' && 'Teams are working on their projects'}
                    {currentEvent.status === 'LOCKED' && 'Preparing for pitches...'}
                    {currentEvent.status === 'COMPLETED' && 'Event completed! Check the results.'}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
