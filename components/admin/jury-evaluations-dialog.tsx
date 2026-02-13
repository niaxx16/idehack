'use client'

import { useEffect, useState } from 'react'
import { Team, JuryScore, Profile } from '@/types'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Star, User, MessageSquare, Route } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface JuryEvaluationsDialogProps {
  team: Team
}

interface JuryScoreWithJury extends JuryScore {
  jury?: Profile
}

const CRITERIA_KEYS = [
  'problem_understanding',
  'innovation',
  'value_impact',
  'feasibility',
  'presentation_teamwork',
] as const

export function JuryEvaluationsDialog({ team }: JuryEvaluationsDialogProps) {
  const supabase = createClient()
  const t = useTranslations('admin.teamTracking.juryDialog')
  const tCriteria = useTranslations('jury.scoringForm')
  const tPaths = useTranslations('jury.scoringForm.projectPaths')
  const [scores, setScores] = useState<JuryScoreWithJury[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [averages, setAverages] = useState<Record<string, number>>({})
  const [totalAverage, setTotalAverage] = useState(0)

  useEffect(() => {
    loadScores()
  }, [team.id])

  const loadScores = async () => {
    setIsLoading(true)
    try {
      // Load jury scores for this team
      const { data: scoresData, error } = await supabase
        .from('jury_scores')
        .select('*, jury:profiles!jury_scores_jury_id_fkey(id, full_name, display_name)')
        .eq('team_id', team.id)

      if (error) throw error

      const scoresWithJury = (scoresData || []).map(score => ({
        ...score,
        jury: score.jury as Profile | undefined,
      }))

      setScores(scoresWithJury)

      // Calculate averages
      if (scoresWithJury.length > 0) {
        const avgByCriteria: Record<string, number> = {}
        let grandTotal = 0

        CRITERIA_KEYS.forEach(key => {
          const sum = scoresWithJury.reduce((acc, s) => {
            const scoreData = s.scores as any
            return acc + (scoreData?.[key] || 0)
          }, 0)
          avgByCriteria[key] = sum / scoresWithJury.length
          grandTotal += avgByCriteria[key]
        })

        setAverages(avgByCriteria)
        setTotalAverage(grandTotal)
      }
    } catch (error) {
      console.error('Failed to load jury scores:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 16) return 'text-green-600 bg-green-50'
    if (score >= 12) return 'text-blue-600 bg-blue-50'
    if (score >= 8) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  if (isLoading) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{team.name}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    )
  }

  if (scores.length === 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{team.name}</DialogDescription>
        </DialogHeader>
        <div className="text-center py-8 text-muted-foreground">
          {t('noEvaluations')}
        </div>
      </>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{team.name} - {scores.length} {t('evaluationCount')}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{t('averageScores')}</h3>
              <Badge variant="secondary" className="text-lg font-bold px-4 py-1">
                {totalAverage.toFixed(1)} / 100
              </Badge>
            </div>
            <div className="space-y-3">
              {CRITERIA_KEYS.map(key => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{tCriteria(key)}</span>
                    <span className="font-medium">{averages[key]?.toFixed(1) || 0} / 20</span>
                  </div>
                  <Progress value={(averages[key] || 0) * 5} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Individual Evaluations */}
        <div className="space-y-4">
          <h3 className="font-semibold">{t('individualEvaluations')}</h3>
          {scores.map((score, index) => {
            const scoreData = score.scores as any
            const total = CRITERIA_KEYS.reduce((acc, key) => acc + (scoreData?.[key] || 0), 0)

            return (
              <Card key={score.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">
                        {score.jury?.full_name || score.jury?.display_name || t('anonymousJury')}
                      </span>
                    </div>
                    <Badge className={getScoreColor(total / 5)}>
                      <Star className="h-3 w-3 mr-1" />
                      {total} / 100
                    </Badge>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center text-xs mb-3">
                    {CRITERIA_KEYS.map(key => (
                      <div key={key} className="space-y-1">
                        <div className="font-medium text-muted-foreground truncate" title={tCriteria(key)}>
                          {tCriteria(key).slice(0, 10)}...
                        </div>
                        <div className={`rounded px-2 py-1 ${getScoreColor(scoreData?.[key] || 0)}`}>
                          {scoreData?.[key] || 0}
                        </div>
                      </div>
                    ))}
                  </div>

                  {scoreData?.project_paths?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-start gap-2">
                        <Route className="h-4 w-4 text-primary mt-0.5" />
                        <div className="flex flex-wrap gap-1.5">
                          {scoreData.project_paths.map((path: string) => (
                            <Badge key={path} variant="outline" className="text-xs">
                              {tPaths(path)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {score.comments && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm text-muted-foreground italic">{score.comments}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </>
  )
}
