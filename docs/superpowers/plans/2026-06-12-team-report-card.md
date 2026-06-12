# Etkinlik Sonrası Takım Karnesi — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Etkinlik COMPLETED olduğunda takımlar öğrenci ekranında jüri ortalamaları, anonim jüri yorumları, proje yolu önerileri ve mentör değerlendirmelerinden oluşan bir karne görür ve PDF indirir.

**Architecture:** Yeni `get_team_report_card(team_id)` SECURITY DEFINER RPC'si jüri verisini DB katmanında anonimleştirip tek JSONB döner; takım üyesi yalnızca etkinlik COMPLETED iken, admin her zaman erişir. İstemcide yeni `ReportCard` bileşeni RPC + mevcut RLS'le okunabilen `mentor_feedback`'i çeker, ekranda gösterir ve jsPDF ile PDF üretir.

**Tech Stack:** Next.js 14 (App Router, client components), Supabase (PostgreSQL RPC, RLS), jsPDF + `registerTurkishFont`, next-intl, Shadcn/UI.

**Spec:** `docs/superpowers/specs/2026-06-12-team-report-card-design.md`

**Doğrulama düzeni (bu repo):** Test altyapısı yok; her görev `npm run lint` (yalnızca değişen dosyalarda yeni hata olmaması) + `npm run build` ile doğrulanır. Migration canlı Supabase SQL Editor'de çalıştırılır (CLAUDE.md kuralı).

---

### Task 1: Migration — `get_team_report_card` RPC

**Files:**
- Create: `supabase/migrations/add_team_report_card.sql`

- [ ] **Step 1: Migration dosyasını yaz**

Dosyanın tamamı:

```sql
-- Post-event team report card RPC.
-- Returns jury averages, anonymous jury comments, project path counts and
-- named mentor evaluations as a single JSONB. Raw jury_scores rows (and jury
-- identities) never reach the client.
-- Access: team members only while their event is COMPLETED; event-owner
-- admins and super admins at any time. Everyone else gets NULL.

CREATE OR REPLACE FUNCTION get_team_report_card(team_id_input UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller profiles%ROWTYPE;
  target_team teams%ROWTYPE;
  target_event events%ROWTYPE;
  is_allowed BOOLEAN := FALSE;
  jury_count INTEGER;
  jury_averages JSONB;
  jury_total NUMERIC;
  jury_comments JSONB;
  jury_paths JSONB;
  mentor_evals JSONB;
BEGIN
  SELECT * INTO target_team FROM teams WHERE id = team_id_input;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO target_event FROM events WHERE id = target_team.event_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF caller.role = 'admin'
     AND (COALESCE(caller.is_super_admin, FALSE) OR target_event.created_by = caller.id) THEN
    is_allowed := TRUE;
  ELSIF caller.team_id = team_id_input AND target_event.status = 'COMPLETED' THEN
    is_allowed := TRUE;
  END IF;

  IF NOT is_allowed THEN RETURN NULL; END IF;

  -- Jury aggregates: only new-format rows (5-criteria scoring)
  SELECT
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN NULL ELSE jsonb_build_object(
      'problem_understanding', ROUND(AVG((js.scores->>'problem_understanding')::NUMERIC), 1),
      'innovation',            ROUND(AVG((js.scores->>'innovation')::NUMERIC), 1),
      'value_impact',          ROUND(AVG((js.scores->>'value_impact')::NUMERIC), 1),
      'feasibility',           ROUND(AVG((js.scores->>'feasibility')::NUMERIC), 1),
      'presentation_teamwork', ROUND(AVG((js.scores->>'presentation_teamwork')::NUMERIC), 1)
    ) END,
    CASE WHEN COUNT(*) = 0 THEN NULL ELSE ROUND(AVG(
      (js.scores->>'problem_understanding')::NUMERIC +
      (js.scores->>'innovation')::NUMERIC +
      (js.scores->>'value_impact')::NUMERIC +
      (js.scores->>'feasibility')::NUMERIC +
      (js.scores->>'presentation_teamwork')::NUMERIC
    ), 1) END
  INTO jury_count, jury_averages, jury_total
  FROM jury_scores js
  WHERE js.team_id = team_id_input
    AND js.scores ? 'problem_understanding';

  -- Anonymous comments (non-empty only, oldest first)
  SELECT COALESCE(jsonb_agg(c.comments ORDER BY c.created_at), '[]'::jsonb)
  INTO jury_comments
  FROM (
    SELECT js.comments, js.created_at
    FROM jury_scores js
    WHERE js.team_id = team_id_input
      AND js.scores ? 'problem_understanding'
      AND btrim(COALESCE(js.comments, '')) <> ''
  ) c;

  -- Project path suggestion counts from jury scores
  SELECT COALESCE(jsonb_object_agg(p.path, p.cnt), '{}'::jsonb)
  INTO jury_paths
  FROM (
    SELECT pe.path, COUNT(*) AS cnt
    FROM jury_scores js,
         jsonb_array_elements_text(js.scores->'project_paths') AS pe(path)
    WHERE js.team_id = team_id_input
      AND js.scores ? 'problem_understanding'
      AND jsonb_typeof(js.scores->'project_paths') = 'array'
    GROUP BY pe.path
  ) p;

  -- Named mentor evaluations (skip fully empty rows)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'mentor_name', pr.full_name,
    'evaluation_text', me.evaluation_text,
    'project_paths', to_jsonb(me.project_paths),
    'project_path_reasoning', me.project_path_reasoning
  ) ORDER BY me.created_at), '[]'::jsonb)
  INTO mentor_evals
  FROM mentor_evaluations me
  JOIN profiles pr ON pr.id = me.mentor_id
  WHERE me.team_id = team_id_input
    AND (btrim(me.evaluation_text) <> '' OR COALESCE(array_length(me.project_paths, 1), 0) > 0);

  RETURN jsonb_build_object(
    'team_name', target_team.name,
    'jury', jsonb_build_object(
      'jury_count', jury_count,
      'averages', jury_averages,
      'total_avg', jury_total,
      'comments', jury_comments,
      'project_paths', jury_paths
    ),
    'mentor_evaluations', mentor_evals
  );
END;
$$;
```

- [ ] **Step 2: Commit**

```powershell
git add supabase/migrations/add_team_report_card.sql
git commit -m "Add get_team_report_card RPC migration"
```

(Migration'ın canlıda çalıştırılması Task 6'da.)

---

### Task 2: Tipler

**Files:**
- Modify: `types/index.ts` (dosya sonuna ekle; `JuryScoreData` ve `JURY_CRITERION_MAX` zaten ~111-127 satırlarında)
- Modify: `types/database.ts` (`Functions:` bloğu ~641. satır; `get_leaderboard` girdisi ~653. satırda — alfabetik sıraya uyarak `get_leaderboard`'dan ÖNCE ekle)

- [ ] **Step 1: `types/index.ts`'e karne tipleri ekle**

Dosyanın sonuna:

```ts
// Post-event team report card (get_team_report_card RPC response)
export interface TeamReportCardJury {
  jury_count: number
  averages: JuryScoreData | null
  total_avg: number | null
  comments: string[]
  project_paths: Record<string, number>
}

export interface TeamReportCardMentorEvaluation {
  mentor_name: string | null
  evaluation_text: string
  project_paths: string[]
  project_path_reasoning: string
}

export interface TeamReportCard {
  team_name: string
  jury: TeamReportCardJury
  mentor_evaluations: TeamReportCardMentorEvaluation[]
}
```

- [ ] **Step 2: `types/database.ts` Functions bloğuna RPC girdisini ekle**

`get_leaderboard: {` satırının hemen üstüne (alfabetik konum oraya denk gelmiyorsa mevcut sıralamayı bozma, `get_leaderboard`'a komşu olsun yeter):

```ts
      get_team_report_card: {
        Args: {
          team_id_input: string
        }
        Returns: Json
      }
```

- [ ] **Step 3: Build ile tip kontrolü**

Run: `npm run build`
Expected: `✓ Compiled successfully`, tip hatası yok.

- [ ] **Step 4: Commit**

```powershell
git add types/index.ts types/database.ts
git commit -m "Add team report card types"
```

---

### Task 3: i18n anahtarları

**Files:**
- Modify: `messages/tr.json` (üst seviye `"student"` nesnesinin içine, `"canvas"` ile aynı seviyeye)
- Modify: `messages/en.json` (aynı konum)

Not: Kriter adları (`jury.scoringForm.problem_understanding` vb.) ve proje yolu adları (`jury.scoringForm.projectPaths.*`) mevcut anahtarlardan yeniden kullanılır; kanvas bölüm başlıkları `student.canvas.*`'tan gelir. Yeni anahtar yalnızca karneye özgü metinler için eklenir.

- [ ] **Step 1: `messages/tr.json` → `student` nesnesine ekle**

```json
"reportCard": {
  "title": "Takım Karnesi",
  "congrats": "Tebrikler, etkinliği tamamladınız!",
  "subtitle": "Jüri ve mentörlerinizin değerlendirmeleri aşağıda",
  "juryScores": "Jüri Değerlendirmesi",
  "juryCount": "{count} jüri değerlendirdi",
  "totalScore": "Toplam Ortalama",
  "juryComments": "Jüri Yorumları",
  "juryLabel": "Jüri {n}",
  "projectPathsTitle": "Jürilerin Önerdiği Proje Yolları",
  "mentorEvaluations": "Mentör Değerlendirmeleri",
  "reasoningLabel": "Gerekçe",
  "sectionFeedback": "Kanvas Bölümü Geribildirimleri",
  "noScores": "Bu etkinlikte takımınız jüri tarafından puanlanmadı.",
  "notReady": "Karneniz henüz hazırlanmadı.",
  "downloadPdf": "Karneyi İndir (PDF)",
  "exporting": "PDF hazırlanıyor..."
}
```

- [ ] **Step 2: `messages/en.json` → `student` nesnesine ekle**

```json
"reportCard": {
  "title": "Team Report Card",
  "congrats": "Congratulations, you completed the event!",
  "subtitle": "Your jury and mentor evaluations are below",
  "juryScores": "Jury Evaluation",
  "juryCount": "Evaluated by {count} juries",
  "totalScore": "Overall Average",
  "juryComments": "Jury Comments",
  "juryLabel": "Jury {n}",
  "projectPathsTitle": "Project Paths Suggested by Juries",
  "mentorEvaluations": "Mentor Evaluations",
  "reasoningLabel": "Reasoning",
  "sectionFeedback": "Canvas Section Feedback",
  "noScores": "Your team was not scored by the jury in this event.",
  "notReady": "Your report card is not ready yet.",
  "downloadPdf": "Download Report Card (PDF)",
  "exporting": "Preparing PDF...",
}
```

(Dikkat: JSON'da sondaki virgül hatasına düşme — bloğu eklediğin konuma göre virgülü ayarla.)

- [ ] **Step 3: JSON geçerliliğini doğrula**

Run: `node -e "require('./messages/tr.json'); require('./messages/en.json'); console.log('JSON OK')"`
Expected: `JSON OK`

- [ ] **Step 4: Commit**

```powershell
git add messages/tr.json messages/en.json
git commit -m "Add report card i18n keys"
```

---

### Task 4: `ReportCard` bileşeni (ekran + PDF)

**Files:**
- Create: `components/student/report-card.tsx`

- [ ] **Step 1: Bileşeni yaz**

Dosyanın tamamı:

```tsx
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
```

- [ ] **Step 2: Build ile doğrula**

Run: `npm run build`
Expected: `✓ Compiled successfully`, tip hatası yok. (Bileşen henüz hiçbir yerden import edilmiyor; sadece derlenebilirliği kontrol ediyoruz.)

- [ ] **Step 3: Commit**

```powershell
git add components/student/report-card.tsx
git commit -m "Add ReportCard component with PDF export"
```

---

### Task 5: Öğrenci sayfasına bağlama

**Files:**
- Modify: `app/student/page.tsx` (import bloğu ~13-25; faz bayrakları ~429-432; faz dallanması ~483)

- [ ] **Step 1: Import ekle**

`CanvasPdfExport` import'unun (satır ~19) altına:

```tsx
import { ReportCard } from '@/components/student/report-card'
```

- [ ] **Step 2: Faz bayrağı ekle**

```tsx
  const isPitching = currentEvent?.status === 'PITCHING'
  const canVote = currentEvent?.status === 'VOTING'
  const isIdeation = currentEvent?.status === 'IDEATION'
  const isWaiting = currentEvent?.status === 'WAITING'
  const isCompleted = currentEvent?.status === 'COMPLETED'
```

- [ ] **Step 3: Dallanmanın başına COMPLETED dalını ekle**

`{/* Phase-based content */}` altındaki zincirin başı şu şekilden:

```tsx
        {isWaiting ? (
```

şu hale gelir (`team` bu noktada garanti dolu — başlıkta `team.name` zaten kullanılıyor):

```tsx
        {isCompleted && currentEvent ? (
          <ReportCard
            teamId={team.id}
            teamName={team.name}
            eventName={currentEvent.name}
          />
        ) : isWaiting ? (
```

Zincirin geri kalanına dokunulmaz.

- [ ] **Step 4: Lint + build**

Run: `npm run lint` → `app/student/page.tsx` ve `components/student/report-card.tsx` için YENİ hata olmamalı (mevcut eski hatalar bilinen durum).
Run: `npm run build` → Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```powershell
git add app/student/page.tsx
git commit -m "Show report card on student page when event is completed"
```

---

### Task 6: Migration'ı canlıya uygula + doğrula

**Files:** (kod değişikliği yok)

- [ ] **Step 1: Migration'ı Supabase SQL Editor'de çalıştır**

`supabase/migrations/add_team_report_card.sql` içeriği Supabase Dashboard → SQL Editor'de çalıştırılır (CLAUDE.md kuralı). Çalıştıran: kullanıcı (ya da oturum sırasında anahtar erişimi varsa Claude doğrular).

- [ ] **Step 2: Fonksiyonun varlığını REST ile doğrula**

```powershell
# Service role ile çağrı: auth.uid() NULL olduğundan fonksiyon NULL dönmeli.
# HTTP 200 + null = fonksiyon kurulu ve yetki kontrolü çalışıyor; HTTP 404 = migration uygulanmamış.
$key = "<SERVICE_ROLE_KEY>"
Invoke-RestMethod -Method Post `
  -Uri "https://udlkyxytmyxxktflzfpi.supabase.co/rest/v1/rpc/get_team_report_card" `
  -Headers @{ apikey = $key; Authorization = "Bearer $key"; "Content-Type" = "application/json" } `
  -Body '{"team_id_input":"<COMPLETED_ETKINLIKTEN_BIR_TEAM_ID>"}'
```

Expected: boş/null yanıt (hata yok).

- [ ] **Step 3: Canlı uçtan uca test (manuel)**

"Dijital Hayatını Dengede Tut!" etkinliği COMPLETED ve puanlanmış takımları var:
1. O etkinlikten bir takım hesabıyla `/student` aç → karne görünmeli (jüri ortalamaları + yorumlar + varsa mentör verileri).
2. "Karneyi İndir (PDF)" → PDF inmeli, Türkçe karakterler düzgün, gövde metinleri tam siyah.
3. PITCHING durumundaki başka etkinliğin takımıyla girildiğinde karne GÖRÜNMEMELİ (normal faz ekranı).

- [ ] **Step 4: Push (kullanıcı onayıyla)**

```powershell
git push origin main
```

---

## Self-review notları

- Spec'teki tüm gereksinimlerin görev karşılığı var: RPC (Task 1), tipler (Task 2), i18n (Task 3), ekran+PDF (Task 4), sayfa bağlama (Task 5), canlı doğrulama (Task 6).
- `en.json` Step 2 bloğundaki son satırda virgül YOK olmalı (yukarıdaki blokta `"exporting"` satırı sonundaki virgül eklenme konumuna göre düşürülür) — uygulayıcı dikkat etsin.
- Tip adı çakışması: bileşen içinde `TeamReportCard` tipi `TeamReportCardData` olarak import edilir çünkü bileşen fonksiyonu benzer ad taşıyor (`ReportCard`) — karışıklık yok.
- `juryCount`/`juryLabel` ICU değişkenleri (`{count}`, `{n}`) hem ekranda hem PDF'te aynı `t(...)` çağrısıyla kullanılır.
