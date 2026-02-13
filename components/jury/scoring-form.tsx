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

// 5 criteria, each 1-20 points, total 100
const SCORING_CRITERIA_KEYS = ['problem_understanding', 'innovation', 'value_impact', 'feasibility', 'presentation_teamwork'] as const
const MAX_SCORE_PER_CRITERION = 20
const TOTAL_MAX_SCORE = 100

const SCORE_LEVELS = [
  { min: 1, max: 4, color: 'text-red-600' },
  { min: 5, max: 8, color: 'text-orange-600' },
  { min: 9, max: 12, color: 'text-yellow-600' },
  { min: 13, max: 16, color: 'text-blue-600' },
  { min: 17, max: 20, color: 'text-green-600' },
] as const

function getScoreColor(value: number) {
  return SCORE_LEVELS.find(l => value >= l.min && value <= l.max)?.color || ''
}

export function ScoringForm({ event, team, juryId, onScoreSubmitted }: ScoringFormProps) {
  const t = useTranslations('jury.scoringForm')
  const [scores, setScores] = useState<JuryScoreData>({
    problem_understanding: 10,
    innovation: 10,
    value_impact: 10,
    feasibility: 10,
    presentation_teamwork: 10,
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
      // Handle migration from old 4-criteria to new 5-criteria system
      const loadedScores = data.scores as any
      if (loadedScores.problem_understanding !== undefined) {
        setScores(loadedScores as JuryScoreData)
      } else {
        // Old format - reset to new defaults
        setScores({
          problem_understanding: 10,
          innovation: 10,
          value_impact: 10,
          feasibility: 10,
          presentation_teamwork: 10,
        })
      }
      setComments(data.comments || '')
      setHasExistingScore(true)
    } else {
      // Reset form for new team
      setScores({
        problem_understanding: 10,
        innovation: 10,
        value_impact: 10,
        feasibility: 10,
        presentation_teamwork: 10,
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
        <div className="p-4 bg-primary/5 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('totalScore')}</span>
            <span className="text-3xl font-bold">{totalScore}/{TOTAL_MAX_SCORE}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center text-[10px] font-medium">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">1–4</span>
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">5–8</span>
            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">9–12</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">13–16</span>
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">17–20</span>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">{t('scaleLevels')}</p>
        </div>

        {SCORING_CRITERIA_KEYS.map((criterionKey) => {
          const value = scores[criterionKey as keyof JuryScoreData]
          return (
            <div key={criterionKey} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">
                    {t(criterionKey)} <span className="text-muted-foreground font-normal">({MAX_SCORE_PER_CRITERION}p)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(`${criterionKey}Desc`)}
                  </p>
                </div>
                <div className={`text-2xl font-bold w-12 text-right ${getScoreColor(value)}`}>
                  {value}
                </div>
              </div>
              <Slider
                value={[value]}
                onValueChange={(vals) =>
                  updateScore(criterionKey as keyof JuryScoreData, vals[0])
                }
                min={1}
                max={MAX_SCORE_PER_CRITERION}
                step={1}
                className="w-full"
              />
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
