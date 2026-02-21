'use client'

import { useEffect, useState } from 'react'
import { Event, Profile, JuryScoreData } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, BarChart3, Download } from 'lucide-react'
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
    const keys: (keyof JuryScoreData)[] = [
      'problem_understanding', 'innovation', 'value_impact', 'feasibility', 'presentation_teamwork',
    ]
    return keys.reduce((sum, key) => sum + (s[key] || 0), 0)
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

  const getDetailedScores = (teamId: string, juryId: string): JuryScoreData | null => {
    const record = scores.find(s => s.team_id === teamId && s.jury_id === juryId)
    return record ? record.scores : null
  }

  const CRITERIA_KEYS: (keyof JuryScoreData)[] = [
    'problem_understanding', 'innovation', 'value_impact', 'feasibility', 'presentation_teamwork'
  ]

  const criteriaLabels: Record<keyof JuryScoreData, string> = {
    problem_understanding: t('criteria.problemUnderstanding'),
    innovation: t('criteria.innovation'),
    value_impact: t('criteria.valueImpact'),
    feasibility: t('criteria.feasibility'),
    presentation_teamwork: t('criteria.presentationTeamwork'),
  }

  const exportToExcel = () => {
    if (!event || scores.length === 0) return

    const scoredTeamIds = new Set(scores.map(s => s.team_id))
    const scoredTeams = teams.filter(t => scoredTeamIds.has(t.id))
    const scoredJuryIds = new Set(scores.map(s => s.jury_id))
    const activeJury = juryMembers.filter(j => scoredJuryIds.has(j.id))

    const escapeHtml = (value: string) => {
      return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    }

    // Build headers: Team | Jury1 (criteria) | Jury1 Total | Jury2 (criteria) | Jury2 Total | ... | Average
    const headerRow1: string[] = [`<th rowspan="2" style="background:#f0f0f0;font-weight:bold;border:1px solid #ccc;padding:5px;">${escapeHtml(t('team'))}</th>`]
    const headerRow2: string[] = []

    activeJury.forEach(jury => {
      const name = escapeHtml(jury.full_name || t('anonymousJury'))
      headerRow1.push(`<th colspan="6" style="background:#e8e0f0;font-weight:bold;border:1px solid #ccc;padding:5px;text-align:center;">${name}</th>`)
      CRITERIA_KEYS.forEach(key => {
        headerRow2.push(`<th style="background:#f5f0fa;font-size:10px;border:1px solid #ccc;padding:3px;text-align:center;">${escapeHtml(criteriaLabels[key])}</th>`)
      })
      headerRow2.push(`<th style="background:#e0d5ef;font-weight:bold;border:1px solid #ccc;padding:3px;text-align:center;">${escapeHtml(t('total'))}</th>`)
    })
    headerRow1.push(`<th rowspan="2" style="background:#d4edda;font-weight:bold;border:1px solid #ccc;padding:5px;text-align:center;">${escapeHtml(t('average'))}</th>`)

    // Build data rows
    const dataRows = scoredTeams.map(team => {
      const cells: string[] = [`<td style="font-weight:bold;border:1px solid #ccc;padding:5px;">${escapeHtml(team.name)} (#${team.table_number})</td>`]

      activeJury.forEach(jury => {
        const detailed = getDetailedScores(team.id, jury.id)
        if (detailed) {
          CRITERIA_KEYS.forEach(key => {
            cells.push(`<td style="text-align:center;border:1px solid #ccc;padding:3px;">${detailed[key]}</td>`)
          })
          cells.push(`<td style="text-align:center;font-weight:bold;border:1px solid #ccc;padding:3px;background:#f5f0fa;">${getTotalScore(detailed)}</td>`)
        } else {
          for (let i = 0; i < 6; i++) {
            cells.push(`<td style="text-align:center;border:1px solid #ccc;padding:3px;">-</td>`)
          }
        }
      })

      const avg = getTeamAverage(team.id)
      cells.push(`<td style="text-align:center;font-weight:bold;border:1px solid #ccc;padding:3px;background:#d4edda;">${avg !== null ? avg.toFixed(1) : '-'}</td>`)

      return `<tr>${cells.join('')}</tr>`
    })

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${escapeHtml(t('title'))}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table>
          <thead>
            <tr>${headerRow1.join('')}</tr>
            <tr>${headerRow2.join('')}</tr>
          </thead>
          <tbody>
            ${dataRows.join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${event.name}_juri_puanlari_${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  // Only show teams that have at least one score, sorted by average (highest first)
  const scoredTeamIds = new Set(scores.map(s => s.team_id))
  const scoredTeams = teams
    .filter(t => scoredTeamIds.has(t.id))
    .sort((a, b) => {
      const avgA = getTeamAverage(a.id) ?? 0
      const avgB = getTeamAverage(b.id) ?? 0
      return avgB - avgA
    })

  // Only show jury members that have at least one score
  const scoredJuryIds = new Set(scores.map(s => s.jury_id))
  const activeJury = juryMembers.filter(j => scoredJuryIds.has(j.id))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            {t('exportExcel')}
          </Button>
        </div>
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
