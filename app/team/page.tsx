'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { createClient } from '@/lib/supabase/client'
import { Team, Event } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CanvasForm } from '@/components/team/canvas-form'
import { PresentationUpload } from '@/components/team/presentation-upload'
import { TeamQRCode } from '@/components/team/team-qr-code'
import { Loader2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TeamPage() {
  const router = useRouter()
  const { profile, signOut, isLoading: authLoading } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [memberCount, setMemberCount] = useState(0)
  const supabase = createClient()

  useRealtimeEvent(currentEvent?.id || null)

  useEffect(() => {
    if (!authLoading && !profile?.team_id) {
      router.push('/login')
      return
    }

    if (profile?.team_id) {
      loadTeamData()
    }
  }, [profile, authLoading, router])

  const loadTeamData = async () => {
    if (!profile?.team_id) return

    setIsLoading(true)

    try {
      // Load team data
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*, events(*)')
        .eq('id', profile.team_id)
        .single()

      if (teamError) throw teamError

      setTeam(teamData)
      setCurrentEvent(teamData.events)

      // Count team members
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', profile.team_id)

      setMemberCount(count || 0)
    } catch (error) {
      console.error('Failed to load team data:', error)
    } finally {
      setIsLoading(false)
    }
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

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Team Found</CardTitle>
            <CardDescription>You are not part of any team yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isLocked = currentEvent?.status === 'LOCKED' || currentEvent?.status === 'PITCHING' || currentEvent?.status === 'VOTING' || currentEvent?.status === 'COMPLETED'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Users className="h-4 w-4" />
              Table {team.table_number} • {memberCount} members
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {isLocked && (
          <Card className="border-yellow-500 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-yellow-800">
                Submissions are locked. You can no longer edit your project details.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="canvas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="canvas">Project Canvas</TabsTrigger>
            <TabsTrigger value="presentation">Presentation</TabsTrigger>
            <TabsTrigger value="qr">Team QR</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas">
            <CanvasForm team={team} isLocked={isLocked} onUpdate={loadTeamData} />
          </TabsContent>

          <TabsContent value="presentation">
            <PresentationUpload team={team} isLocked={isLocked} onUpdate={loadTeamData} />
          </TabsContent>

          <TabsContent value="qr">
            <TeamQRCode team={team} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
