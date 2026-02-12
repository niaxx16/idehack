'use client'

import { useEffect, useState } from 'react'
import { Event, Team, CanvasContributionWithUser, TeamDecision, CanvasSection } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useHype } from '@/hooks/use-hype'
import { useAuth } from '@/hooks/use-auth'
import { Flame, HandMetal, Crown, UserCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface PitchViewerProps {
  event: Event
}

export function PitchViewer({ event }: PitchViewerProps) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [contributions, setContributions] = useState<Record<CanvasSection, CanvasContributionWithUser[]>>({
    problem: [],
    solution: [],
    value_proposition: [],
    target_audience: [],
    key_features: [],
    evidence: [],
    pilot_plan: [],
    success_metrics: [],
    resources_risks: [],
  })
  const [teamDecisions, setTeamDecisions] = useState<Record<CanvasSection, TeamDecision | null>>({
    problem: null,
    solution: null,
    value_proposition: null,
    target_audience: null,
    key_features: null,
    evidence: null,
    pilot_plan: null,
    success_metrics: null,
    resources_risks: null,
  })
  const { sendHype, hypeEvents } = useHype(event.id)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (event.current_team_id) {
      loadPitchData(event.current_team_id, event.id)
    } else {
      setCurrentTeam(null)
      // Reset contributions when no team
      setContributions({
        problem: [],
        solution: [],
        value_proposition: [],
        target_audience: [],
        key_features: [],
        evidence: [],
        pilot_plan: [],
        success_metrics: [],
        resources_risks: [],
      })
      setTeamDecisions({
        problem: null,
        solution: null,
        value_proposition: null,
        target_audience: null,
        key_features: null,
        evidence: null,
        pilot_plan: null,
        success_metrics: null,
        resources_risks: null,
      })
    }
  }, [event.current_team_id, event.id])

  useEffect(() => {
    if (event.pitch_timer_end) {
      const endTime = new Date(event.pitch_timer_end).getTime()
      const updateTimer = () => {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
        setTimeRemaining(remaining)
      }

      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    } else {
      setTimeRemaining(0)
    }
  }, [event.pitch_timer_end])

  const loadPitchData = async (teamId: string, eventId: string) => {
    try {
      // Load team, contributions, and decisions in parallel
      const [teamResult, contribResult, decisionsResult] = await Promise.all([
        supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .eq('event_id', eventId)
          .maybeSingle(),
        supabase
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
          .order('created_at', { ascending: true }),
        supabase
          .from('team_decisions')
          .select('*')
          .eq('team_id', teamId),
      ])

      // Set team
      const teamData = teamResult.data
      if (!teamData) {
        setCurrentTeam(null)
        return
      }
      setCurrentTeam(teamData)

      // Group contributions using the freshly fetched team data (not stale closure)
      const members = (teamData.team_members as any[]) || []
      const grouped: Record<CanvasSection, CanvasContributionWithUser[]> = {
        problem: [],
        solution: [],
        value_proposition: [],
        target_audience: [],
        key_features: [],
        evidence: [],
        pilot_plan: [],
        success_metrics: [],
        resources_risks: [],
      }

      ;(contribResult.data || []).forEach((contrib: any) => {
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

      // Set team decisions
      const decisions: Record<CanvasSection, TeamDecision | null> = {
        problem: null,
        solution: null,
        value_proposition: null,
        target_audience: null,
        key_features: null,
        evidence: null,
        pilot_plan: null,
        success_metrics: null,
        resources_risks: null,
      }

      ;(decisionsResult.data || []).forEach((decision: TeamDecision) => {
        decisions[decision.section as CanvasSection] = decision
      })
      setTeamDecisions(decisions)
    } catch (error) {
      console.error('Failed to load pitch data:', error)
    }
  }

  const handleHype = (type: 'clap' | 'fire') => {
    if (user) {
      sendHype(type, user.id)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentTeam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Team Pitching</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Waiting for the next pitch...</p>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = (timeRemaining / (3 * 60)) * 100

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center pb-3">
          <Badge className="mx-auto mb-2 w-fit">Now Pitching</Badge>
          <CardTitle className="text-3xl">{currentTeam.name}</CardTitle>
          <p className="text-muted-foreground">Table {currentTeam.table_number}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Time Remaining</span>
              <span className={`text-2xl font-mono font-bold ${
                timeRemaining < 30 ? 'text-red-600' : ''
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Team decisions are highlighted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Problem */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-red-500 rounded"></div>
              Problem
            </h4>
            {teamDecisions.problem ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.problem.content}</p>
              </div>
            ) : contributions.problem.length > 0 ? (
              <div className="space-y-1">
                {contributions.problem.map((contrib) => (
                  <div key={contrib.id} className="bg-red-50 border border-red-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>

          {/* Solution */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-yellow-500 rounded"></div>
              Solution
            </h4>
            {teamDecisions.solution ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.solution.content}</p>
              </div>
            ) : contributions.solution.length > 0 ? (
              <div className="space-y-1">
                {contributions.solution.map((contrib) => (
                  <div key={contrib.id} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>

          {/* Value Proposition */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-purple-500 rounded"></div>
              Unique Value
            </h4>
            {teamDecisions.value_proposition ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.value_proposition.content}</p>
              </div>
            ) : contributions.value_proposition.length > 0 ? (
              <div className="space-y-1">
                {contributions.value_proposition.map((contrib) => (
                  <div key={contrib.id} className="bg-purple-50 border border-purple-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>

          {/* Target Audience */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-500 rounded"></div>
              Target Audience
            </h4>
            {teamDecisions.target_audience ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.target_audience.content}</p>
              </div>
            ) : contributions.target_audience.length > 0 ? (
              <div className="space-y-1">
                {contributions.target_audience.map((contrib) => (
                  <div key={contrib.id} className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>

          {/* Key Features */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-green-500 rounded"></div>
              Key Features
            </h4>
            {teamDecisions.key_features ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.key_features.content}</p>
              </div>
            ) : contributions.key_features.length > 0 ? (
              <div className="space-y-1">
                {contributions.key_features.map((contrib) => (
                  <div key={contrib.id} className="bg-green-50 border border-green-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>

          {/* Evidence / Insight */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-cyan-500 rounded"></div>
              Evidence / Insight
            </h4>
            {teamDecisions.evidence ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.evidence.content}</p>
              </div>
            ) : contributions.evidence.length > 0 ? (
              <div className="space-y-1">
                {contributions.evidence.map((contrib) => (
                  <div key={contrib.id} className="bg-cyan-50 border border-cyan-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>

          {/* Pilot Plan */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-orange-500 rounded"></div>
              Pilot Plan
            </h4>
            {teamDecisions.pilot_plan ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.pilot_plan.content}</p>
              </div>
            ) : contributions.pilot_plan.length > 0 ? (
              <div className="space-y-1">
                {contributions.pilot_plan.map((contrib) => (
                  <div key={contrib.id} className="bg-orange-50 border border-orange-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>

          {/* Success Metrics */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-indigo-500 rounded"></div>
              Success Metrics
            </h4>
            {teamDecisions.success_metrics ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.success_metrics.content}</p>
              </div>
            ) : contributions.success_metrics.length > 0 ? (
              <div className="space-y-1">
                {contributions.success_metrics.map((contrib) => (
                  <div key={contrib.id} className="bg-indigo-50 border border-indigo-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>

          {/* Resources & Risks */}
          <div>
            <h4 className="font-medium mb-1 text-sm flex items-center gap-2">
              <div className="w-1 h-3 bg-rose-500 rounded"></div>
              Resources & Risks
            </h4>
            {teamDecisions.resources_risks ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Team Decision</span>
                </div>
                <p className="text-xs font-medium">{teamDecisions.resources_risks.content}</p>
              </div>
            ) : contributions.resources_risks.length > 0 ? (
              <div className="space-y-1">
                {contributions.resources_risks.map((contrib) => (
                  <div key={contrib.id} className="bg-rose-50 border border-rose-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                    </div>
                    <p className="text-xs">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not specified</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Show Your Support!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleHype('clap')}
              variant="outline"
              className="h-20 text-lg"
            >
              <HandMetal className="mr-2 h-6 w-6" />
              Clap
            </Button>
            <Button
              onClick={() => handleHype('fire')}
              variant="outline"
              className="h-20 text-lg"
            >
              <Flame className="mr-2 h-6 w-6" />
              Fire
            </Button>
          </div>

          {/* Show hype animations */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {hypeEvents.map((hype) => (
              <div
                key={hype.timestamp}
                className="absolute animate-float"
                style={{
                  left: `${Math.random() * 80 + 10}%`,
                  top: '100%',
                  fontSize: '3rem',
                  animation: 'float 3s ease-out forwards',
                }}
              >
                {hype.type === 'clap' ? '👏' : '🔥'}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}
