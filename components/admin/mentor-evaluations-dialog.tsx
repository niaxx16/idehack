'use client'

import { useEffect, useState } from 'react'
import { Team, MentorEvaluationWithMentor, Profile } from '@/types'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Loader2, User, MessageSquare, Route } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface MentorEvaluationsDialogProps {
  team: Team
}

const PROJECT_PATH_LABELS: Record<string, string> = {
  startup: 'Startup',
  tubitak2204: 'TÜBİTAK 2204',
  teknofest: 'TEKNOFEST',
  socialApp: 'Social App',
}

export function MentorEvaluationsDialog({ team }: MentorEvaluationsDialogProps) {
  const supabase = createClient()
  const t = useTranslations('admin.teamTracking.mentorEvalDialog')
  const tPaths = useTranslations('mentor.generalEvaluation.projectPaths')
  const [evaluations, setEvaluations] = useState<MentorEvaluationWithMentor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEvaluations()
  }, [team.id])

  const loadEvaluations = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('mentor_evaluations')
        .select('*, mentor:profiles(*)')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const evalsWithMentor = (data || []).map(ev => ({
        ...ev,
        mentor: ev.mentor as Profile | undefined,
      }))

      setEvaluations(evalsWithMentor)
    } catch (error) {
      console.error('Failed to load mentor evaluations:', error)
    } finally {
      setIsLoading(false)
    }
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

  if (evaluations.length === 0) {
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
        <DialogDescription>{team.name} - {evaluations.length} {evaluations.length === 1 ? 'evaluation' : 'evaluations'}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {evaluations.map((evaluation) => (
          <Card key={evaluation.id} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Mentor Name */}
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  {evaluation.mentor?.full_name || evaluation.mentor?.display_name || 'Mentor'}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(evaluation.updated_at).toLocaleString('tr-TR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* General Evaluation */}
              {evaluation.evaluation_text && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('generalEvaluation')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                    {evaluation.evaluation_text}
                  </p>
                </div>
              )}

              {/* Project Paths */}
              {evaluation.project_paths && evaluation.project_paths.length > 0 && (
                <div className="mb-3 pt-3 border-t">
                  <div className="flex items-start gap-2">
                    <Route className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <span className="text-sm font-medium">{t('suggestedPaths')}</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {evaluation.project_paths.map((path: string) => (
                          <Badge key={path} variant="outline" className="text-xs">
                            {tPaths.has(path) ? tPaths(path) : PROJECT_PATH_LABELS[path] || path}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {evaluation.project_path_reasoning && (
                <div className="pt-3 border-t">
                  <span className="text-sm font-medium">{t('reasoning')}</span>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                    {evaluation.project_path_reasoning}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
