'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  JURY_CRITERION_MAX,
  JuryScoreData,
  MentorFeedbackWithMentor,
  TeamReportCard as TeamReportCardData,
} from '@/types'
import { registerTurkishFont } from '@/lib/utils/pdf-font'
import jsPDF from 'jspdf'
import { Award, Download, Loader2, MessageSquare, Route, UserCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

const CRITERIA_KEYS: (keyof JuryScoreData)[] = [
  'problem_understanding',
  'innovation',
  'value_impact',
  'feasibility',
  'presentation_teamwork',
]

const KNOWN_PROJECT_PATHS = ['startup', 'tubitak2204', 'teknofest', 'socialApp']

// canvas_section value -> student.canvas.* title key (same mapping as canvas-pdf-export)
const SECTION_TITLE_KEYS: Record<string, string> = {
  problem: 'problem',
  solution: 'solution',
  value_proposition: 'uniqueValue',
  target_audience: 'targetAudience',
  evidence: 'evidence',
  key_features: 'keyFeatures',
  pilot_plan: 'pilotPlan',
  success_metrics: 'successMetrics',
  resources_risks: 'resourcesRisks',
}

interface ReportCardProps {
  teamId: string
  teamName: string
  eventName: string
}

export function ReportCard({ teamId, teamName, eventName }: ReportCardProps) {
  const t = useTranslations('student.reportCard')
  const tCriteria = useTranslations('jury.scoringForm')
  const tCanvas = useTranslations('student.canvas')
  const [report, setReport] = useState<TeamReportCardData | null>(null)
  const [feedbacks, setFeedbacks] = useState<MentorFeedbackWithMentor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  const loadReport = async () => {
    try {
      const [rpcRes, fbRes] = await Promise.all([
        supabase.rpc('get_team_report_card', { team_id_input: teamId }),
        supabase
          .from('mentor_feedback')
          .select('*, mentor:profiles(*)')
          .eq('team_id', teamId)
          .order('created_at', { ascending: true }),
      ])

      if (rpcRes.error) throw rpcRes.error
      setReport((rpcRes.data as unknown as TeamReportCardData) ?? null)

      if (!fbRes.error) {
        setFeedbacks((fbRes.data as unknown as MentorFeedbackWithMentor[]) || [])
      }
    } catch (error) {
      console.error('Failed to load report card:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const pathLabel = (path: string) =>
    KNOWN_PROJECT_PATHS.includes(path) ? tCriteria(`projectPaths.${path}`) : path

  const feedbacksBySection = feedbacks.reduce<Record<string, MentorFeedbackWithMentor[]>>(
    (acc, fb) => {
      ;(acc[fb.canvas_section] = acc[fb.canvas_section] || []).push(fb)
      return acc
    },
    {}
  )

  const exportPdf = async () => {
    if (!report) return
    setIsExporting(true)

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      await registerTurkishFont(pdf)

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - 2 * margin
      let y = margin

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          pdf.addPage()
          y = margin
        }
      }

      const heading = (text: string) => {
        ensureSpace(14)
        pdf.setFillColor(243, 232, 255)
        pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
        pdf.setFontSize(12)
        pdf.setTextColor(88, 28, 135)
        pdf.text(text, margin + 3, y + 5.5)
        y += 12
      }

      const paragraph = (text: string, size: number, r: number, g: number, b: number) => {
        pdf.setFontSize(size)
        pdf.setTextColor(r, g, b)
        const lines = pdf.splitTextToSize(text, contentWidth - 4)
        for (const line of lines) {
          ensureSpace(5)
          pdf.text(line, margin + 2, y)
          y += 5
        }
      }

      // Title
      pdf.setFontSize(20)
      pdf.setTextColor(88, 28, 135)
      pdf.text(teamName, pageWidth / 2, y + 3, { align: 'center' })
      y += 11
      pdf.setFontSize(11)
      pdf.setTextColor(55, 65, 81)
      pdf.text(`${eventName} · ${t('title')}`, pageWidth / 2, y, { align: 'center' })
      y += 12

      // Jury scores
      heading(t('juryScores'))
      if (report.jury.jury_count > 0 && report.jury.averages) {
        for (const key of CRITERIA_KEYS) {
          paragraph(
            `${tCriteria(key)}: ${report.jury.averages[key]} / ${JURY_CRITERION_MAX[key]}`,
            10, 0, 0, 0
          )
        }
        y += 2
        paragraph(`${t('totalScore')}: ${report.jury.total_avg} / 100`, 13, 0, 0, 0)
        paragraph(t('juryCount', { count: report.jury.jury_count }), 9, 55, 65, 81)
        y += 4

        if (report.jury.comments.length > 0) {
          heading(t('juryComments'))
          report.jury.comments.forEach((comment, i) => {
            paragraph(t('juryLabel', { n: i + 1 }), 8, 55, 65, 81)
            paragraph(comment, 10, 0, 0, 0)
            y += 2
          })
        }

        const pathEntries = Object.entries(report.jury.project_paths)
        if (pathEntries.length > 0) {
          heading(t('projectPathsTitle'))
          paragraph(
            pathEntries.map(([p, count]) => `${pathLabel(p)} ×${count}`).join('   '),
            10, 0, 0, 0
          )
          y += 2
        }
      } else {
        paragraph(t('noScores'), 10, 55, 65, 81)
        y += 4
      }

      // Mentor evaluations
      if (report.mentor_evaluations.length > 0) {
        heading(t('mentorEvaluations'))
        for (const me of report.mentor_evaluations) {
          paragraph(me.mentor_name || '', 9, 55, 65, 81)
          if (me.evaluation_text.trim()) {
            paragraph(me.evaluation_text, 10, 0, 0, 0)
          }
          if (me.project_paths.length > 0) {
            paragraph(me.project_paths.map(pathLabel).join(', '), 9, 55, 65, 81)
          }
          if (me.project_path_reasoning.trim()) {
            paragraph(`${t('reasoningLabel')}: ${me.project_path_reasoning}`, 9, 0, 0, 0)
          }
          y += 3
        }
      }

      // Section-based mentor feedback
      const sectionsWithFeedback = Object.keys(SECTION_TITLE_KEYS).filter(
        (s) => feedbacksBySection[s]?.length
      )
      if (sectionsWithFeedback.length > 0) {
        heading(t('sectionFeedback'))
        for (const section of sectionsWithFeedback) {
          paragraph(tCanvas(SECTION_TITLE_KEYS[section]), 10, 55, 65, 81)
          for (const fb of feedbacksBySection[section]) {
            paragraph(
              `${fb.mentor?.full_name || ''}: ${fb.feedback_text}`,
              10, 0, 0, 0
            )
          }
          y += 2
        }
      }

      pdf.save(`${teamName.replace(/\s+/g, '_')}_Karne.pdf`)
    } catch (error) {
      console.error('Report card PDF export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">{t('notReady')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Award className="h-6 w-6 text-purple-600" />
                {t('congrats')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
            </div>
            <Button onClick={exportPdf} disabled={isExporting} className="gap-2">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('exporting')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t('downloadPdf')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jury scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-purple-600" />
            {t('juryScores')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.jury.jury_count > 0 && report.jury.averages ? (
            <div className="space-y-4">
              {CRITERIA_KEYS.map((key) => {
                const avg = report.jury.averages![key]
                const max = JURY_CRITERION_MAX[key]
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{tCriteria(key)}</span>
                      <span className="font-mono font-bold">
                        {avg} / {max}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-purple-500 rounded-full"
                        style={{ width: `${Math.min(100, (avg / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-semibold">{t('totalScore')}</span>
                <span className="text-2xl font-bold text-purple-700">
                  {report.jury.total_avg} / 100
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('juryCount', { count: report.jury.jury_count })}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('noScores')}</p>
          )}
        </CardContent>
      </Card>

      {/* Jury comments */}
      {report.jury.comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              {t('juryComments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.jury.comments.map((comment, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {t('juryLabel', { n: i + 1 })}
                </p>
                <p className="text-sm whitespace-pre-wrap">{comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Project paths suggested by juries */}
      {Object.keys(report.jury.project_paths).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Route className="h-5 w-5 text-green-600" />
              {t('projectPathsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.jury.project_paths).map(([path, count]) => (
                <Badge key={path} variant="outline" className="text-sm px-3 py-1">
                  {pathLabel(path)} ×{count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mentor evaluations */}
      {report.mentor_evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle className="h-5 w-5 text-orange-600" />
              {t('mentorEvaluations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.mentor_evaluations.map((me, i) => (
              <div key={i} className="p-4 bg-orange-50/50 rounded-lg border border-orange-100 space-y-2">
                <p className="text-sm font-semibold">{me.mentor_name}</p>
                {me.evaluation_text.trim() && (
                  <p className="text-sm whitespace-pre-wrap">{me.evaluation_text}</p>
                )}
                {me.project_paths.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {me.project_paths.map((path) => (
                      <Badge key={path} variant="secondary" className="text-xs">
                        {pathLabel(path)}
                      </Badge>
                    ))}
                  </div>
                )}
                {me.project_path_reasoning.trim() && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{t('reasoningLabel')}:</span>{' '}
                    {me.project_path_reasoning}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section-based mentor feedback */}
      {feedbacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-teal-600" />
              {t('sectionFeedback')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(SECTION_TITLE_KEYS)
              .filter((section) => feedbacksBySection[section]?.length)
              .map((section) => (
                <div key={section}>
                  <p className="text-sm font-semibold mb-2">
                    {tCanvas(SECTION_TITLE_KEYS[section])}
                  </p>
                  <div className="space-y-2">
                    {feedbacksBySection[section].map((fb) => (
                      <div key={fb.id} className="p-3 bg-slate-50 rounded-lg border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {fb.mentor?.full_name}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{fb.feedback_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
