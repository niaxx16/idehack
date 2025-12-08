'use client'

import { useEffect, useState } from 'react'
import { Event, Team, JuryScoreData } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ScoringFormProps {
  event: Event
  team: Team
  juryId: string
  onScoreSubmitted: () => void
}

const SCORING_CRITERIA_KEYS = ['innovation', 'presentation', 'feasibility', 'impact'] as const

export function ScoringForm({ event, team, juryId, onScoreSubmitted }: ScoringFormProps) {
  const t = useTranslations('jury.scoringForm')
  const [scores, setScores] = useState<JuryScoreData>({
    innovation: 5,
    presentation: 5,
    feasibility: 5,
    impact: 5,
  })
  const [comments, setComments] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasExistingScore, setHasExistingScore] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; key: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadExistingScore()
  }, [team.id, juryId])

  const loadExistingScore = async () => {
    const { data, error } = await supabase
      .from('jury_scores')
      .select('id, jury_id, team_id, scores, comments, created_at')
      .eq('jury_id', juryId)
      .eq('team_id', team.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading score:', error)
    }

    if (data) {
      setScores(data.scores as JuryScoreData)
      setComments(data.comments || '')
      setHasExistingScore(true)
    } else {
      // Reset form for new team
      setScores({
        innovation: 5,
        presentation: 5,
        feasibility: 5,
        impact: 5,
      })
      setComments('')
      setHasExistingScore(false)
    }
  }

  const updateScore = (criterion: keyof JuryScoreData, value: number) => {
    setScores((prev) => ({
      ...prev,
      [criterion]: value,
    }))
  }

  const saveScore = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const { error } = await supabase
        .from('jury_scores')
        .upsert({
          jury_id: juryId,
          team_id: team.id,
          scores,
          comments,
        })

      if (error) throw error

      setHasExistingScore(true)
      setSaveMessage({ type: 'success', key: 'scoreSaved' })
      onScoreSubmitted()

      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save score:', error)
      setSaveMessage({ type: 'error', key: 'saveFailed' })
    } finally {
      setIsSaving(false)
    }
  }

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('totalScore')}</span>
            <span className="text-3xl font-bold">{totalScore}/40</span>
          </div>
        </div>

        {SCORING_CRITERIA_KEYS.map((criterionKey) => {
          const value = scores[criterionKey as keyof JuryScoreData]
          return (
            <div key={criterionKey} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">
                    {t(criterionKey)}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(`${criterionKey}Desc`)}
                  </p>
                </div>
                <div className="text-2xl font-bold w-12 text-right">
                  {value}
                </div>
              </div>
              <Slider
                value={[value]}
                onValueChange={(vals) =>
                  updateScore(criterionKey as keyof JuryScoreData, vals[0])
                }
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('poor')} (1)</span>
                <span>{t('excellent')} (10)</span>
              </div>
            </div>
          )
        })}

        <div className="space-y-2">
          <Label htmlFor="comments">{t('comments')}</Label>
          <Textarea
            id="comments"
            placeholder={t('commentsPlaceholder')}
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        {saveMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              saveMessage.type === 'success'
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            {saveMessage.type === 'success' && (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{t(saveMessage.key)}</span>
          </div>
        )}

        <Button onClick={saveScore} disabled={isSaving} className="w-full h-12 text-lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              {hasExistingScore ? t('updateScore') : t('saveScore')}
            </>
          )}
        </Button>

        {hasExistingScore && (
          <p className="text-xs text-center text-muted-foreground">
            {t('alreadyScored')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
