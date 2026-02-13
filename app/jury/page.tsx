'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Event, Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StreamViewer } from '@/components/jury/stream-viewer'
import { ScoringForm } from '@/components/jury/scoring-form'
import { MyScoresList } from '@/components/jury/my-scores-list'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-provider'
import { Locale } from '@/lib/i18n/config'
import { useTranslations } from 'next-intl'

export default function JuryPage() {
  const router = useRouter()
  const { profile, signOut, isLoading: authLoading } = useAuth()
  const { setLocale } = useLanguage()
  const t = useTranslations('jury')
  const tCommon = useTranslations('common')
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; table_number: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Update language when event changes
  useEffect(() => {
    if (currentEvent?.language) {
      setLocale(currentEvent.language as Locale)
    }
  }, [currentEvent?.language, setLocale])

  useEffect(() => {
    if (!authLoading && profile?.role !== 'jury') {
      router.push('/login')
      return
    }

    if (profile?.role === 'jury') {
      loadEventData()
    }
  }, [profile, authLoading, router])

  // Real-time subscription for event changes
  useEffect(() => {
    if (!currentEvent?.id) return

    const channel = supabase
      .channel(`jury-event-${currentEvent.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${currentEvent.id}`,
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
      supabase.removeChannel(channel)
    }
  }, [currentEvent?.id, supabase])

  useEffect(() => {
    if (currentEvent?.current_team_id) {
      loadCurrentTeam()
      // Active pitch started, clear manual editing
      setEditingTeam(null)
    } else {
      setCurrentTeam(null)
    }
  }, [currentEvent?.current_team_id])

  const loadEventData = async () => {
    setIsLoading(true)

    try {
      // Jüri kendi event_id'sine göre event'i yüklemeli
      if (profile?.event_id) {
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', profile.event_id)
          .single()

        if (eventData) {
          setCurrentEvent(eventData)
        }
      } else {
        // event_id yoksa event bulunamadı
        setCurrentEvent(null)
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
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
              <p className="text-sm text-muted-foreground">
                {currentEvent?.name || t('noActiveEvent')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              {tCommon('signOut')}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {currentEvent && currentTeam ? (
            <div className="grid md:grid-cols-2 gap-4 p-4 max-w-screen-2xl mx-auto">
              {/* Left: Stream Viewer */}
              <div>
                <StreamViewer event={currentEvent} team={currentTeam} />
              </div>

              {/* Right: Scoring Form */}
              <div>
                <ScoringForm
                  event={currentEvent}
                  team={currentTeam}
                  juryId={profile.id}
                  onScoreSubmitted={loadEventData}
                />
              </div>
            </div>
          ) : editingTeam && currentEvent ? (
            <div className="p-4 max-w-screen-2xl mx-auto">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{editingTeam.name}</h2>
                    <p className="text-sm text-muted-foreground">{t('streamViewer.table')} {editingTeam.table_number} · {t('myScores.editingScore')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditingTeam(null)}>
                    {tCommon('close')}
                  </Button>
                </div>
                <ScoringForm
                  event={currentEvent}
                  team={{ id: editingTeam.id, name: editingTeam.name, table_number: editingTeam.table_number } as Team}
                  juryId={profile.id}
                  onScoreSubmitted={() => setEditingTeam(null)}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 py-12">
              <Card className="max-w-md w-full">
                <CardHeader>
                  <CardTitle>{t('noActivePitch')}</CardTitle>
                  <CardDescription>
                    {currentEvent?.status === 'PITCHING'
                      ? t('waitingForPitch')
                      : currentEvent
                      ? t('waitingForPhase')
                      : t('noActiveEvent')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentEvent?.status === 'PITCHING' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                      <p className="font-medium mb-1">{t('pitchingPhaseActive')}</p>
                      <p className="text-xs">
                        {t('pitchingPhaseInfo')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* My Scores List */}
          {currentEvent && profile && (
            <div className="p-4 pt-0 max-w-screen-2xl mx-auto">
              <MyScoresList
                juryId={profile.id}
                eventId={currentEvent.id}
                onSelectTeam={(team) => {
                  if (currentTeam) return // Active pitch running, don't allow manual editing
                  setEditingTeam(prev => prev?.id === team.id ? null : team)
                }}
                selectedTeamId={editingTeam?.id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
