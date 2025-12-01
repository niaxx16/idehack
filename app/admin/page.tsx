'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { createClient } from '@/lib/supabase/client'
import { Event, Team } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EventControl } from '@/components/admin/event-control'
import { EventManagement } from '@/components/admin/event-management'
import { TeamManagement } from '@/components/admin/team-management'
import { PitchControl } from '@/components/admin/pitch-control'
import { Leaderboard } from '@/components/admin/leaderboard'
import { MentorManagement } from '@/components/admin/mentor-management'
import { JuryManagement } from '@/components/admin/jury-management'
import { AdminManagement } from '@/components/admin/admin-management'
import { TopInvestors } from '@/components/admin/top-investors'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const { profile, signOut, isLoading } = useAuth()
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState('control')
  const supabase = createClient()

  useRealtimeEvent(currentEvent?.id || null)

  useEffect(() => {
    // Wait for loading to finish
    if (isLoading) return

    // If not loading and no profile, redirect to login
    if (!profile) {
      router.push('/login')
      return
    }

    // If profile exists but not admin, redirect to login
    if (profile.role !== 'admin') {
      router.push('/login')
      return
    }

    // If admin, load data
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isLoading])

  const loadData = async (selectedEvent?: Event) => {
    setIsLoadingData(true)

    // Use provided event or current event, or load the first event
    let eventToUse = selectedEvent || currentEvent

    if (!eventToUse) {
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (eventData) {
        eventToUse = eventData
        setCurrentEvent(eventData)
      }
    } else {
      // Refresh the event from database to get latest status
      const { data: refreshedEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventToUse.id)
        .single()

      if (refreshedEvent) {
        eventToUse = refreshedEvent
        setCurrentEvent(refreshedEvent)
      }
    }

    if (eventToUse) {
      // Load teams for this event
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('event_id', eventToUse.id)
        .order('table_number', { ascending: true })

      if (teamsData) {
        setTeams(teamsData)
      }
    }

    setIsLoadingData(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleEventSelect = (event: Event) => {
    setCurrentEvent(event)
    loadData(event)
  }

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (profile?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              {currentEvent?.name || 'No event selected'}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="control">Event Control</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="mentors">Mentors</TabsTrigger>
            <TabsTrigger value="jury">Jury</TabsTrigger>
            <TabsTrigger value="pitch">Pitch Control</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="admins">
            <AdminManagement currentUser={profile} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="events">
            <EventManagement
              currentEvent={currentEvent}
              onEventSelect={handleEventSelect}
              onUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="control">
            <EventControl event={currentEvent} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="teams">
            <TeamManagement event={currentEvent} teams={teams} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="mentors">
            <MentorManagement event={currentEvent} teams={teams} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="jury">
            <JuryManagement event={currentEvent} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="pitch">
            <PitchControl event={currentEvent} teams={teams} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <div className="space-y-6">
              <Leaderboard event={currentEvent} />
              <TopInvestors event={currentEvent} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
