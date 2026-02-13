'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ClipboardList, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { JuryScoreData } from '@/types'

interface MyScoresListProps {
  juryId: string
  eventId: string
  onSelectTeam?: (team: { id: string; name: string; table_number: number }) => void
  selectedTeamId?: string | null
  refreshTrigger?: number
}

interface ScoredTeam {
  id: string
  team_id: string
  scores: JuryScoreData
  comments: string | null
  updated_at: string
  team: {
    name: string
    table_number: number
  }
}

const CRITERIA_KEYS: (keyof JuryScoreData)[] = [
  'problem_understanding',
  'innovation',
  'value_impact',
  'feasibility',
  'presentation_teamwork',
]

export function MyScoresList({ juryId, eventId, onSelectTeam, selectedTeamId, refreshTrigger }: MyScoresListProps) {
  const t = useTranslations('jury')
  const [scoredTeams, setScoredTeams] = useState<ScoredTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadMyScores()
  }, [juryId, eventId, refreshTrigger])

  // Listen for score changes
  useEffect(() => {
    const channel = supabase
      .channel(`my-scores-${juryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jury_scores',
          filter: `jury_id=eq.${juryId}`,
        },
        () => {
          loadMyScores()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [juryId, supabase])

  const loadMyScores = async () => {
    try {
      const { data, error } = await supabase
        .from('jury_scores')
        .select('id, team_id, scores, comments, updated_at, teams!inner(name, table_number, event_id)')
        .eq('jury_id', juryId)
        .eq('teams.event_id', eventId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        team_id: item.team_id,
        scores: item.scores as JuryScoreData,
        comments: item.comments,
        updated_at: item.updated_at,
        team: {
          name: item.teams.name,
          table_number: item.teams.table_number,
        },
      }))

      setScoredTeams(mapped)
    } catch (error) {
      console.error('Failed to load scores:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTotalScore = (scores: JuryScoreData) => {
    return CRITERIA_KEYS.reduce((sum, key) => sum + (scores[key] || 0), 0)
  }

  const getScoreBadgeColor = (total: number) => {
    if (total >= 80) return 'bg-green-100 text-green-800 border-green-300'
    if (total >= 60) return 'bg-blue-100 text-blue-800 border-blue-300'
    if (total >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (scoredTeams.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          {t('myScores.title')} ({scoredTeams.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scoredTeams.map((item) => {
            const total = getTotalScore(item.scores)
            return (
              <div
                key={item.id}
                onClick={() => onSelectTeam?.({ id: item.team_id, name: item.team.name, table_number: item.team.table_number })}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  onSelectTeam ? 'cursor-pointer' : ''
                } ${
                  selectedTeamId === item.team_id
                    ? 'bg-primary/5 border-primary ring-1 ring-primary/20'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.team.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{t('streamViewer.table')} {item.team.table_number}</span>
                      <span>·</span>
                      <span>{new Date(item.updated_at).toLocaleString('tr-TR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-1">
                    {CRITERIA_KEYS.map((key) => (
                      <span
                        key={key}
                        className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded"
                        title={t(`scoringForm.${key}`)}
                      >
                        {item.scores[key]}
                      </span>
                    ))}
                  </div>
                  <Badge
                    variant="outline"
                    className={`font-mono font-bold text-sm px-2.5 py-1 ${getScoreBadgeColor(total)}`}
                  >
                    {total}/100
                  </Badge>
                  {onSelectTeam && (
                    <Pencil className={`h-4 w-4 ${selectedTeamId === item.team_id ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
