'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { Event, Team, Profile, MentorAssignmentWithDetails } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut, Users, FileText, MessageSquare } from 'lucide-react'
import { TeamCanvasView } from '@/components/mentor/team-canvas-view'
import { useLanguage } from '@/lib/i18n/language-provider'
import { Locale } from '@/lib/i18n/config'

export default function MentorPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setLocale } = useLanguage()

  const [isLoading, setIsLoading] = useState(true)
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<MentorAssignmentWithDetails[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  useRealtimeEvent(currentEvent?.id || null)

  // Update language when event changes
  useEffect(() => {
    if (currentEvent?.language) {
      setLocale(currentEvent.language as Locale)
    }
  }, [currentEvent?.language, setLocale])

  useEffect(() => {
    loadData()
  }, [])

  // Real-time subscription for assignments
  useEffect(() => {
    const channel = supabase
      .channel('mentor-assignments-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_assignments',
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Real-time subscription for teams (canvas updates)
  useEffect(() => {
    const channel = supabase
      .channel('teams-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          // Reload all data to refresh assignments with latest team data
          loadData()

          // If this is the selected team, update it specifically
          if (selectedTeam && payload.new && payload.new.id === selectedTeam.id) {
            setSelectedTeam(payload.new as Team)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedTeam])

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Check if user is a mentor
      if (profileData.role !== 'mentor') {
        router.push('/login')
        return
      }

      setProfile(profileData)

      // Load event based on mentor's event_id
      if (profileData.event_id) {
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', profileData.event_id)
          .single()

        if (eventData) {
          setCurrentEvent(eventData)
        }
      } else {
        setCurrentEvent(null)
      }

      // Get mentor assignments with team details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('mentor_assignments')
        .select('*, team:teams(*)')
        .eq('mentor_id', user.id)

      if (assignmentsError) throw assignmentsError

      setAssignments(assignmentsData || [])
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Access denied. Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Mentor Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome, {profile.full_name}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Event Status */}
        {currentEvent && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="text-purple-900">Current Event</CardTitle>
              <CardDescription>{currentEvent.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Phase:</span>
                <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {currentEvent.status}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mentor Role Guide */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-900">Mentor Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-amber-800 font-medium">
              A mentor is not someone who gives solutions, but a guide who deepens the team's thinking process.
            </p>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>Ask questions throughout the process</li>
              <li>Help teams make their ideas clearer, more applicable, and more impactful</li>
              <li>Stay neutral, guide without making decisions for them</li>
            </ul>
          </CardContent>
        </Card>

        {/* Team Canvas View or Team List */}
        {selectedTeam ? (
          <div className="space-y-4">
            <Button variant="outline" onClick={() => setSelectedTeam(null)}>
              ← Back to Teams
            </Button>
            <TeamCanvasView team={selectedTeam} onClose={() => setSelectedTeam(null)} />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Assigned Teams ({assignments.length})</CardTitle>
              <CardDescription>
                {currentEvent?.status === 'IDEATION'
                  ? 'Guide teams with questions to help them develop their ideas'
                  : 'View your assigned teams'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No teams assigned yet.</p>
                  <p className="text-sm mt-2">Contact the admin to get team assignments.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assignments.map((assignment) => {
                    const team = assignment.team as Team
                    if (!team) return null

                    const members = (team.team_members as any[]) || []
                    const hasCanvas = team.canvas_data && (
                      team.canvas_data.problem ||
                      team.canvas_data.solution ||
                      team.canvas_data.target_audience ||
                      team.canvas_data.value_proposition ||
                      team.canvas_data.key_features ||
                      team.canvas_data.revenue_model
                    )

                    return (
                      <Card
                        key={assignment.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer border-purple-100"
                        onClick={() => setSelectedTeam(team)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <CardDescription>Table {team.table_number}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                          </div>

                          {hasCanvas && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <FileText className="h-4 w-4" />
                              <span>Canvas in progress</span>
                            </div>
                          )}

                          <Button className="w-full" size="sm">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            View & Give Feedback
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
