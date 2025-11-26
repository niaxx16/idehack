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

interface ScoringFormProps {
  event: Event
  team: Team
  juryId: string
  onScoreSubmitted: () => void
}

const SCORING_CRITERIA = [
  { key: 'innovation', label: 'Innovation', description: 'Originality and creativity of the solution' },
  { key: 'presentation', label: 'Presentation', description: 'Quality of pitch and communication' },
  { key: 'feasibility', label: 'Feasibility', description: 'Practicality and implementation potential' },
  { key: 'impact', label: 'Impact', description: 'Potential social or business impact' },
]

export function ScoringForm({ event, team, juryId, onScoreSubmitted }: ScoringFormProps) {
  const [scores, setScores] = useState<JuryScoreData>({
    innovation: 5,
    presentation: 5,
    feasibility: 5,
    impact: 5,
  })
  const [comments, setComments] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasExistingScore, setHasExistingScore] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadExistingScore()
  }, [team.id, juryId])

  const loadExistingScore = async () => {
    const { data } = await supabase
      .from('jury_scores')
      .select('*')
      .eq('jury_id', juryId)
      .eq('team_id', team.id)
      .single()

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
      setSaveMessage('Score saved successfully!')
      onScoreSubmitted()

      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save score:', error)
      setSaveMessage('Failed to save score')
    } finally {
      setIsSaving(false)
    }
  }

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoring Form</CardTitle>
        <CardDescription>
          Rate this team on a scale of 1-10 for each criterion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Score</span>
            <span className="text-3xl font-bold">{totalScore}/40</span>
          </div>
        </div>

        {SCORING_CRITERIA.map((criterion) => {
          const value = scores[criterion.key as keyof JuryScoreData]
          return (
            <div key={criterion.key} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">
                    {criterion.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {criterion.description}
                  </p>
                </div>
                <div className="text-2xl font-bold w-12 text-right">
                  {value}
                </div>
              </div>
              <Slider
                value={[value]}
                onValueChange={(vals) =>
                  updateScore(criterion.key as keyof JuryScoreData, vals[0])
                }
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Poor (1)</span>
                <span>Excellent (10)</span>
              </div>
            </div>
          )
        })}

        <div className="space-y-2">
          <Label htmlFor="comments">Comments (Optional)</Label>
          <Textarea
            id="comments"
            placeholder="Add your feedback for this team..."
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        {saveMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              saveMessage.includes('success')
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            {saveMessage.includes('success') && (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{saveMessage}</span>
          </div>
        )}

        <Button onClick={saveScore} disabled={isSaving} className="w-full h-12 text-lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              {hasExistingScore ? 'Update Score' : 'Save Score'}
            </>
          )}
        </Button>

        {hasExistingScore && (
          <p className="text-xs text-center text-muted-foreground">
            You have already scored this team. Click to update.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
