'use client'

import { useState, useEffect } from 'react'
import { Team, MentorEvaluation } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronRight, Save, Loader2, CheckCircle, Route, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface MentorGeneralEvaluationProps {
  team: Team
  mentorId: string
}

const PROJECT_PATH_KEYS = ['startup', 'tubitak2204', 'teknofest', 'socialApp'] as const
type ProjectPath = typeof PROJECT_PATH_KEYS[number]

export function MentorGeneralEvaluation({ team, mentorId }: MentorGeneralEvaluationProps) {
  const supabase = createClient()
  const t = useTranslations('mentor.generalEvaluation')
  const [isOpen, setIsOpen] = useState(false)
  const [evaluationText, setEvaluationText] = useState('')
  const [projectPaths, setProjectPaths] = useState<ProjectPath[]>([])
  const [reasoning, setReasoning] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; key: string } | null>(null)
  const [hasExisting, setHasExisting] = useState(false)

  useEffect(() => {
    loadExistingEvaluation()
  }, [team.id, mentorId])

  const loadExistingEvaluation = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('mentor_evaluations')
        .select('*')
        .eq('team_id', team.id)
        .eq('mentor_id', mentorId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading evaluation:', error)
      }

      if (data) {
        const evaluation = data as MentorEvaluation
        setEvaluationText(evaluation.evaluation_text || '')
        setProjectPaths((evaluation.project_paths || []) as ProjectPath[])
        setReasoning(evaluation.project_path_reasoning || '')
        setHasExisting(true)
      }
    } catch (error) {
      console.error('Failed to load evaluation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleProjectPath = (path: ProjectPath) => {
    setProjectPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const { error } = await supabase
        .from('mentor_evaluations')
        .upsert({
          team_id: team.id,
          mentor_id: mentorId,
          evaluation_text: evaluationText.trim(),
          project_paths: projectPaths,
          project_path_reasoning: reasoning.trim(),
        }, { onConflict: 'team_id,mentor_id' })

      if (error) throw error

      setHasExisting(true)
      setSaveMessage({ type: 'success', key: 'saved' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save evaluation:', error)
      setSaveMessage({ type: 'error', key: 'saveFailed' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-indigo-200 bg-indigo-50/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-indigo-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-indigo-900">{t('title')}</CardTitle>
                  <CardDescription className="text-xs">{t('description')}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasExisting && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <>
                {/* General Evaluation Textarea */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t('title')}</Label>
                  <Textarea
                    placeholder={t('evaluationPlaceholder')}
                    value={evaluationText}
                    onChange={(e) => setEvaluationText(e.target.value)}
                    rows={5}
                    maxLength={2000}
                    className="resize-none"
                  />
                  <p className="text-xs text-right text-muted-foreground">
                    {evaluationText.length}/2000
                  </p>
                </div>

                {/* Project Path Checkboxes */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">{t('projectPathTitle')}</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {PROJECT_PATH_KEYS.map((pathKey) => (
                      <label
                        key={pathKey}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          projectPaths.includes(pathKey)
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        <Checkbox
                          checked={projectPaths.includes(pathKey)}
                          onCheckedChange={() => toggleProjectPath(pathKey)}
                        />
                        <span className="text-sm font-medium">{t(`projectPaths.${pathKey}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Reasoning Textarea */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t('reasoningTitle')}</Label>
                  <Textarea
                    placeholder={t('reasoningPlaceholder')}
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="resize-none"
                  />
                  <p className="text-xs text-right text-muted-foreground">
                    {reasoning.length}/1000
                  </p>
                </div>

                {/* Save Message */}
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

                {/* Save Button */}
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('save')}
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
