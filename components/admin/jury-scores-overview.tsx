'use client'

import { useEffect, useState } from 'react'
import { Event, Profile, JuryScoreData } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BarChart3 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface JuryScoresOverviewProps {
  event: Event | null
  juryMembers: Profile[]
}

interface ScoreRecord {
  id: string
  jury_id: string
  team_id: string
  scores: JuryScoreData
  comments: string | null
  updated_at: string
}

interface TeamInfo {
  id: string
  name: string
  table_number: number
}

export function JuryScoresOverview({ event, juryMembers }: JuryScoresOverviewProps) {
  const t = useTranslations('admin.juryScoresOverview')
  const [scores, setScores] = useState<ScoreRecord[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (event?.id) {
      loadData()
    }
  }, [event?.id, juryMembers])

  // Real-time subscription for score changes
  useEffect(() => {
    if (!event?.id) return

    const channel = supabase
      .channel('jury-scores-overview')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jury_scores',
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event?.id, supabase])

  const loadData = async () => {
    if (!event?.id) return

    try {
      // Load teams for this event
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, table_number')
        .eq('event_id', event.id)
        .order('table_number')

      setTeams(teamsData || [])

      if (!teamsData || teamsData.length === 0) {
        setScores([])
        setIsLoading(false)
        return
      }

      // Load all jury scores for these teams
      const { data: scoresData } = await supabase
        .from('jury_scores')
        .select('id, jury_id, team_id, scores, comments, updated_at')
        .in('team_id', teamsData.map(t => t.id))

      setScores((scoresData as ScoreRecord[]) || [])
    } catch (error) {
      console.error('Failed to load jury scores:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTotalScore = (s: JuryScoreData) => {
    return Object.values(s).reduce((sum, v) => sum + v, 0)
  }

  const getScoreForCell = (teamId: string, juryId: string): number | null => {
    const record = scores.find(s => s.team_id === teamId && s.jury_id === juryId)
    if (!record) return null
    return getTotalScore(record.scores)
  }

  const getTeamAverage = (teamId: string): number | null => {
    const teamScores = scores.filter(s => s.team_id === teamId)
    if (teamScores.length === 0) return null
    const total = teamScores.reduce((sum, s) => sum + getTotalScore(s.scores), 0)
    return total / teamScores.length
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300'
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-300'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  if (!event) return null

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (scores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">{t('noScores')}</p>
        </CardContent>
      </Card>
    )
  }

  // Only show teams that have at least one score
  const scoredTeamIds = new Set(scores.map(s => s.team_id))
  const scoredTeams = teams.filter(t => scoredTeamIds.has(t.id))

  // Only show jury members that have at least one score
  const scoredJuryIds = new Set(scores.map(s => s.jury_id))
  const activeJury = juryMembers.filter(j => scoredJuryIds.has(j.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">{t('team')}</TableHead>
                {activeJury.map(jury => (
                  <TableHead key={jury.id} className="text-center min-w-[100px]">
                    <span className="text-xs">{jury.full_name || t('anonymousJury')}</span>
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[100px] font-bold">{t('average')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoredTeams.map(team => {
                const avg = getTeamAverage(team.id)
                return (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{team.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">#{team.table_number}</span>
                      </div>
                    </TableCell>
                    {activeJury.map(jury => {
                      const score = getScoreForCell(team.id, jury.id)
                      return (
                        <TableCell key={jury.id} className="text-center">
                          {score !== null ? (
                            <Badge
                              variant="outline"
                              className={`font-mono text-xs ${getScoreBadgeColor(score)}`}
                            >
                              {score}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center">
                      {avg !== null ? (
                        <Badge
                          variant="outline"
                          className={`font-mono font-bold ${getScoreBadgeColor(avg)}`}
                        >
                          {avg.toFixed(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
