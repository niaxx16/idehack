'use client'

import { useState, useEffect } from 'react'
import { Event, Team, CanvasContributionWithUser, TeamDecision, CanvasSection } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { Play, Pause, ExternalLink, Clock, Crown, UserCircle, Download, Video, Loader2, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useHype } from '@/hooks/use-hype'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PitchControlProps {
  event: Event | null
  teams: Team[]
  onUpdate: () => void
}

const PITCH_DURATION = 3 * 60 // 3 minutes in seconds

export function PitchControl({ event, teams, onUpdate }: PitchControlProps) {
  const t = useTranslations('admin.pitchControl')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [isStarting, setIsStarting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [streamUrl, setStreamUrl] = useState('')
  const [isUpdatingStream, setIsUpdatingStream] = useState(false)
  const [contributions, setContributions] = useState<Record<CanvasSection, CanvasContributionWithUser[]>>({
    problem: [],
    solution: [],
    value_proposition: [],
    target_audience: [],
    key_features: [],
    revenue_model: [],
  })
  const [teamDecisions, setTeamDecisions] = useState<Record<CanvasSection, TeamDecision | null>>({
    problem: null,
    solution: null,
    value_proposition: null,
    target_audience: null,
    key_features: null,
    revenue_model: null,
  })
  const supabase = createClient()
  const { hypeEvents } = useHype(event?.id || null)

  const currentTeam = teams.find((t) => t.id === event?.current_team_id)

  // Load stream URL from event
  useEffect(() => {
    if (event?.stream_url) {
      setStreamUrl(event.stream_url)
    } else {
      setStreamUrl('')
    }
  }, [event?.stream_url])

  // Load contributions and team decisions when current team changes
  useEffect(() => {
    if (currentTeam?.id) {
      loadContributions(currentTeam.id)
      loadTeamDecisions(currentTeam.id)
    } else {
      // Reset contributions when no team is selected
      setContributions({
        problem: [],
        solution: [],
        value_proposition: [],
        target_audience: [],
        key_features: [],
        revenue_model: [],
      })
      setTeamDecisions({
        problem: null,
        solution: null,
        value_proposition: null,
        target_audience: null,
        key_features: null,
        revenue_model: null,
      })
    }
  }, [currentTeam?.id])

  // Real-time subscription for canvas contributions
  useEffect(() => {
    if (!currentTeam?.id) return

    const channel = supabase
      .channel(`admin-contributions-${currentTeam.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_contributions',
          filter: `team_id=eq.${currentTeam.id}`,
        },
        () => {
          loadContributions(currentTeam.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentTeam?.id, supabase])

  // Real-time subscription for team decisions
  useEffect(() => {
    if (!currentTeam?.id) return

    const channel = supabase
      .channel(`admin-decisions-${currentTeam.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_decisions',
          filter: `team_id=eq.${currentTeam.id}`,
        },
        () => {
          loadTeamDecisions(currentTeam.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentTeam?.id, supabase])

  useEffect(() => {
    if (event?.pitch_timer_end) {
      const endTime = new Date(event.pitch_timer_end).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))

      setTimeRemaining(remaining)
      setIsTimerActive(remaining > 0)
    } else {
      setTimeRemaining(0)
      setIsTimerActive(false)
    }
  }, [event])

  useEffect(() => {
    if (!isTimerActive || timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1
        if (newTime <= 0) {
          setIsTimerActive(false)
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isTimerActive, timeRemaining])

  const loadContributions = async (teamId: string) => {
    try {
      const members = (currentTeam?.team_members as any[]) || []

      // Load contributions with profile information
      const { data, error } = await supabase
        .from('canvas_contributions')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            display_name,
            role
          )
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by section and enrich with member info
      const grouped: Record<CanvasSection, CanvasContributionWithUser[]> = {
        problem: [],
        solution: [],
        value_proposition: [],
        target_audience: [],
        key_features: [],
        revenue_model: [],
      }

      ;(data || []).forEach((contrib: any) => {
        const member = members.find((m: any) => m.user_id === contrib.user_id)
        const profile = contrib.profiles
        const memberName = profile?.display_name || profile?.full_name || member?.name || 'Unknown'
        const memberRole = member?.role || 'Student'
        const isCaptain = member?.is_captain || false

        const enriched = {
          ...contrib,
          member_name: memberName,
          member_role: memberRole,
          is_captain: isCaptain,
        }
        grouped[contrib.section as CanvasSection].push(enriched)
      })

      setContributions(grouped)
    } catch (error) {
      console.error('Failed to load contributions:', error)
    }
  }

  const loadTeamDecisions = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_decisions')
        .select('*')
        .eq('team_id', teamId)

      if (error) throw error

      const decisions: Record<CanvasSection, TeamDecision | null> = {
        problem: null,
        solution: null,
        value_proposition: null,
        target_audience: null,
        key_features: null,
        revenue_model: null,
      }

      ;(data || []).forEach((decision: TeamDecision) => {
        decisions[decision.section as CanvasSection] = decision
      })

      setTeamDecisions(decisions)
    } catch (error) {
      console.error('Failed to load team decisions:', error)
    }
  }

  const startPitch = async () => {
    if (!event || !selectedTeamId) return

    setIsStarting(true)
    try {
      const endTime = new Date(Date.now() + PITCH_DURATION * 1000)

      const { error } = await supabase
        .from('events')
        .update({
          current_team_id: selectedTeamId,
          pitch_timer_end: endTime.toISOString(),
        })
        .eq('id', event.id)

      if (error) throw error

      onUpdate()
      setIsTimerActive(true)
    } catch (error) {
      console.error('Failed to start pitch:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const stopPitch = async () => {
    if (!event) return

    setIsStarting(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({
          current_team_id: null,
          pitch_timer_end: null,
        })
        .eq('id', event.id)

      if (error) throw error

      onUpdate()
      setIsTimerActive(false)
      setTimeRemaining(0)
    } catch (error) {
      console.error('Failed to stop pitch:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const updateStreamUrl = async () => {
    if (!event) return

    setIsUpdatingStream(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({ stream_url: streamUrl.trim() || null })
        .eq('id', event.id)

      if (error) throw error

      onUpdate()
    } catch (error) {
      console.error('Failed to update stream URL:', error)
    } finally {
      setIsUpdatingStream(false)
    }
  }

  const downloadPresentation = async () => {
    if (!currentTeam?.presentation_url) return

    try {
      // Fetch the file
      const response = await fetch(currentTeam.presentation_url)
      if (!response.ok) throw new Error('Failed to fetch file')

      // Get the content type from response
      const contentType = response.headers.get('content-type') || 'application/octet-stream'
      const blob = await response.blob()

      // Create blob with correct MIME type
      const properBlob = new Blob([blob], { type: contentType })

      // Create download link
      const url = window.URL.createObjectURL(properBlob)
      const a = document.createElement('a')
      a.href = url

      // Extract filename from URL
      const urlParts = currentTeam.presentation_url.split('/')
      let filename = urlParts[urlParts.length - 1]

      // If filename doesn't have extension, add it based on content type
      if (!filename.includes('.')) {
        const extension = contentType.includes('pdf') ? '.pdf' :
                         contentType.includes('powerpoint') || contentType.includes('presentation') ? '.pptx' :
                         contentType.includes('msword') || contentType.includes('document') ? '.docx' : ''
        filename = `${currentTeam.name}-presentation${extension}`
      }

      // Decode URL-encoded filename
      filename = decodeURIComponent(filename)

      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)
    } catch (error) {
      console.error('Failed to download presentation:', error)
      // Fallback to opening in new tab
      window.open(currentTeam.presentation_url, '_blank')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = (timeRemaining / PITCH_DURATION) * 100

  return (
    <div className="space-y-6 relative">
      {/* Emoji Animations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {hypeEvents.map((hype) => (
          <div
            key={hype.timestamp}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: '100%',
              fontSize: '4rem',
              animation: 'float 3s ease-out forwards',
            }}
          >
            {hype.type === 'clap' ? '👏' : '🔥'}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          from {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-100vh) scale(1.5);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float 3s ease-out forwards;
        }
      `}</style>

      {/* Stream URL Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Stream Configuration
          </CardTitle>
          <CardDescription>
            Set the live stream URL for jury members to watch presentations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="streamUrl">Stream URL (YouTube, Zoom, etc.)</Label>
            <div className="flex gap-2">
              <Input
                id="streamUrl"
                type="url"
                placeholder="https://youtube.com/watch?v=... or https://zoom.us/..."
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
              />
              <Button
                onClick={updateStreamUrl}
                disabled={isUpdatingStream}
                variant="secondary"
              >
                {isUpdatingStream ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </div>
          {event?.stream_url && (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>Stream URL is configured and visible to jury members</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!currentTeam ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('selectTeam')}</label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('chooseTeam')} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({t('table')} {team.table_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={startPitch}
                disabled={!selectedTeamId || isStarting}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                {t('startPitch')}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Badge className="mb-2">{t('nowPitching')}</Badge>
                <h3 className="text-2xl font-bold">{currentTeam.name}</h3>
                <p className="text-muted-foreground">{t('table')} {currentTeam.table_number}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('timeRemaining')}
                  </span>
                  <span className={`text-2xl font-mono font-bold ${
                    timeRemaining < 30 ? 'text-red-600' : 'text-primary'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {currentTeam.presentation_url && (
                  <Button onClick={downloadPresentation} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Presentation
                  </Button>
                )}
                <Button
                  onClick={stopPitch}
                  variant="destructive"
                  disabled={isStarting}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  {t('stopPitch')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentTeam && (
        <Card>
          <CardHeader>
            <CardTitle>{t('projectDetails')}</CardTitle>
            <CardDescription>
              Team decisions are highlighted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Problem */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-red-500 rounded"></div>
                {t('problem')}
              </h4>
              {teamDecisions.problem ? (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Team Decision</span>
                  </div>
                  <p className="text-sm font-medium">{teamDecisions.problem.content}</p>
                </div>
              ) : contributions.problem.length > 0 ? (
                <div className="space-y-2">
                  {contributions.problem.map((contrib) => (
                    <div key={contrib.id} className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="flex items-center gap-1 mb-1">
                        {contrib.is_captain ? (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        ) : (
                          <UserCircle className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs font-medium">{contrib.member_name}</span>
                        <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                      </div>
                      <p className="text-sm">{contrib.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('notSpecified')}</p>
              )}
            </div>

            {/* Solution */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-yellow-500 rounded"></div>
                {t('solution')}
              </h4>
              {teamDecisions.solution ? (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Team Decision</span>
                  </div>
                  <p className="text-sm font-medium">{teamDecisions.solution.content}</p>
                </div>
              ) : contributions.solution.length > 0 ? (
                <div className="space-y-2">
                  {contributions.solution.map((contrib) => (
                    <div key={contrib.id} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <div className="flex items-center gap-1 mb-1">
                        {contrib.is_captain ? (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        ) : (
                          <UserCircle className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs font-medium">{contrib.member_name}</span>
                        <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                      </div>
                      <p className="text-sm">{contrib.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('notSpecified')}</p>
              )}
            </div>

            {/* Value Proposition */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded"></div>
                Unique Value
              </h4>
              {teamDecisions.value_proposition ? (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Team Decision</span>
                  </div>
                  <p className="text-sm font-medium">{teamDecisions.value_proposition.content}</p>
                </div>
              ) : contributions.value_proposition.length > 0 ? (
                <div className="space-y-2">
                  {contributions.value_proposition.map((contrib) => (
                    <div key={contrib.id} className="bg-purple-50 border border-purple-200 rounded p-2">
                      <div className="flex items-center gap-1 mb-1">
                        {contrib.is_captain ? (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        ) : (
                          <UserCircle className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs font-medium">{contrib.member_name}</span>
                        <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                      </div>
                      <p className="text-sm">{contrib.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('notSpecified')}</p>
              )}
            </div>

            {/* Target Audience */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded"></div>
                {t('targetAudience')}
              </h4>
              {teamDecisions.target_audience ? (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Team Decision</span>
                  </div>
                  <p className="text-sm font-medium">{teamDecisions.target_audience.content}</p>
                </div>
              ) : contributions.target_audience.length > 0 ? (
                <div className="space-y-2">
                  {contributions.target_audience.map((contrib) => (
                    <div key={contrib.id} className="bg-blue-50 border border-blue-200 rounded p-2">
                      <div className="flex items-center gap-1 mb-1">
                        {contrib.is_captain ? (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        ) : (
                          <UserCircle className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs font-medium">{contrib.member_name}</span>
                        <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                      </div>
                      <p className="text-sm">{contrib.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('notSpecified')}</p>
              )}
            </div>

            {/* Key Features */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-green-500 rounded"></div>
                Key Features
              </h4>
              {teamDecisions.key_features ? (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Team Decision</span>
                  </div>
                  <p className="text-sm font-medium">{teamDecisions.key_features.content}</p>
                </div>
              ) : contributions.key_features.length > 0 ? (
                <div className="space-y-2">
                  {contributions.key_features.map((contrib) => (
                    <div key={contrib.id} className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="flex items-center gap-1 mb-1">
                        {contrib.is_captain ? (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        ) : (
                          <UserCircle className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs font-medium">{contrib.member_name}</span>
                        <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                      </div>
                      <p className="text-sm">{contrib.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('notSpecified')}</p>
              )}
            </div>

            {/* Revenue Model */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500 rounded"></div>
                {t('revenueModel')}
              </h4>
              {teamDecisions.revenue_model ? (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Team Decision</span>
                  </div>
                  <p className="text-sm font-medium">{teamDecisions.revenue_model.content}</p>
                </div>
              ) : contributions.revenue_model.length > 0 ? (
                <div className="space-y-2">
                  {contributions.revenue_model.map((contrib) => (
                    <div key={contrib.id} className="bg-emerald-50 border border-emerald-200 rounded p-2">
                      <div className="flex items-center gap-1 mb-1">
                        {contrib.is_captain ? (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        ) : (
                          <UserCircle className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs font-medium">{contrib.member_name}</span>
                        <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                      </div>
                      <p className="text-sm">{contrib.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('notSpecified')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
