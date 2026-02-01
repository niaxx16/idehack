'use client'

import { useEffect, useState } from 'react'
import type { Event, Team, TeamTracking as TeamTrackingType, LeaderboardEntry } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, ClipboardList, Phone, Save, Check, School, User, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TeamCanvasViewer } from './team-canvas-viewer'
import { JuryEvaluationsDialog } from './jury-evaluations-dialog'

interface TeamTrackingProps {
  event: Event | null
  teams: Team[]
  onUpdate: () => void
}

interface TeamTrackingRecord {
  id: string
  team_id: string
  project_path: string | null
  project_path_other: string | null
  incubation_status: string
  incubation_start_date: string | null
  incubation_end_date: string | null
  incubation_notes: string | null
  mentor_project_expert: string | null
  mentor_domain_expert: string | null
  application_submitted: boolean
  application_date: string | null
  application_result: string | null
  result_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface TeamTrackingData extends Team {
  tracking: TeamTrackingRecord | null
  leaderboard_score: number | null
}

export function TeamTracking({ event, teams, onUpdate }: TeamTrackingProps) {
  const supabase = createClient()
  const t = useTranslations('admin.teamTracking')
  const [trackingData, setTrackingData] = useState<TeamTrackingData[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null)
  const [savedTeamId, setSavedTeamId] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null)
  const [selectedTeamForCanvas, setSelectedTeamForCanvas] = useState<Team | null>(null)
  const [selectedTeamForJury, setSelectedTeamForJury] = useState<Team | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<TeamTrackingRecord & { advisor_phone?: string }>>>({})

  useEffect(() => {
    if (event) {
      loadData()
    }
  }, [event, teams])

  const loadData = async () => {
    if (!event) return
    setIsLoading(true)

    try {
      // Load leaderboard scores
      const { data: leaderboardData, error: leaderboardError } = await supabase.rpc('get_leaderboard', {
        event_id_input: event.id,
      })

      if (leaderboardError) {
        console.error('Leaderboard error:', leaderboardError)
      }
      setLeaderboard(leaderboardData || [])

      // Load tracking data for all teams (skip if no teams)
      let trackingRecords: TeamTrackingRecord[] | null = null
      if (teams.length > 0) {
        const { data, error: trackingError } = await (supabase as any)
          .from('team_tracking')
          .select('*')
          .in('team_id', teams.map((t: Team) => t.id)) as { data: TeamTrackingRecord[] | null, error: any }

        if (trackingError) {
          console.error('Tracking error:', trackingError)
        }
        trackingRecords = data
      }

      // Merge teams with tracking data
      const merged: TeamTrackingData[] = teams.map(team => {
        const tracking = trackingRecords?.find(tr => tr.team_id === team.id) || null
        const score = leaderboardData?.find((l: LeaderboardEntry) => l.team_id === team.id)?.final_score || null
        return {
          ...team,
          tracking,
          leaderboard_score: score,
        }
      })

      // Sort by leaderboard score (highest first), teams without score at the end
      merged.sort((a, b) => {
        if (a.leaderboard_score === null && b.leaderboard_score === null) return 0
        if (a.leaderboard_score === null) return 1
        if (b.leaderboard_score === null) return -1
        return b.leaderboard_score - a.leaderboard_score
      })

      setTrackingData(merged)
    } catch (error) {
      console.error('Failed to load tracking data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateLocalState = (teamId: string, field: string, value: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [field]: value,
      }
    }))
  }

  const saveChanges = async (teamId: string) => {
    const changes = pendingChanges[teamId]
    if (!changes) return

    setSavingTeamId(teamId)

    try {
      // Separate advisor_phone from tracking fields
      const { advisor_phone, ...trackingFields } = changes

      // Update advisor_phone in teams table if changed
      if (advisor_phone !== undefined) {
        await supabase
          .from('teams')
          .update({ advisor_phone })
          .eq('id', teamId)
      }

      // Update or insert tracking data if there are tracking fields
      if (Object.keys(trackingFields).length > 0) {
        const existingTracking = trackingData.find(t => t.id === teamId)?.tracking

        if (existingTracking) {
          await (supabase as any)
            .from('team_tracking')
            .update(trackingFields)
            .eq('team_id', teamId)
        } else {
          await (supabase as any)
            .from('team_tracking')
            .insert({ team_id: teamId, ...trackingFields })
        }
      }

      // Clear pending changes for this team
      setPendingChanges(prev => {
        const newChanges = { ...prev }
        delete newChanges[teamId]
        return newChanges
      })

      // Show saved indicator
      setSavedTeamId(teamId)
      setTimeout(() => setSavedTeamId(null), 2000)

      // Reload data
      loadData()
    } catch (error) {
      console.error('Failed to save changes:', error)
    } finally {
      setSavingTeamId(null)
    }
  }

  const getDisplayValue = (teamId: string, field: string, originalValue: any) => {
    const pending = pendingChanges[teamId]
    if (pending && field in pending) {
      return pending[field as keyof typeof pending]
    }
    return originalValue
  }

  const hasChanges = (teamId: string) => {
    return !!pendingChanges[teamId] && Object.keys(pendingChanges[teamId]).length > 0
  }

  const getProjectPathLabel = (path: string | null) => {
    if (!path) return '-'
    const labels: Record<string, string> = {
      startup: t('projectPaths.startup'),
      tubitak: t('projectPaths.tubitak'),
      teknofest: t('projectPaths.teknofest'),
      other: t('projectPaths.other'),
    }
    return labels[path] || path
  }

  const getIncubationStatusLabel = (status: string | null) => {
    if (!status) return '-'
    const labels: Record<string, string> = {
      not_started: t('incubationStatus.not_started'),
      in_progress: t('incubationStatus.in_progress'),
      completed: t('incubationStatus.completed'),
    }
    return labels[status] || status
  }

  const getApplicationResultLabel = (result: string | null) => {
    if (!result) return '-'
    const labels: Record<string, string> = {
      pending: t('applicationResult.pending'),
      accepted: t('applicationResult.accepted'),
      rejected: t('applicationResult.rejected'),
    }
    return labels[result] || result
  }

  const exportToExcel = () => {
    if (!event || trackingData.length === 0) return

    // CSV header
    const headers = [
      t('schoolName'),
      t('teamName'),
      t('advisorTeacher'),
      t('advisorPhone'),
      t('score'),
      t('projectPath'),
      t('incubation'),
      t('mentorProject'),
      t('mentorDomain'),
      t('applicationSubmitted'),
      t('result'),
      t('notes'),
    ]

    // CSV rows
    const rows = trackingData.map(team => [
      team.school_name || '',
      team.name,
      team.advisor_teacher || '',
      team.advisor_phone || '',
      team.leaderboard_score?.toFixed(1) || '',
      getProjectPathLabel(team.tracking?.project_path || null),
      getIncubationStatusLabel(team.tracking?.incubation_status || null),
      team.tracking?.mentor_project_expert || '',
      team.tracking?.mentor_domain_expert || '',
      team.tracking?.application_submitted ? t('yes') : t('no'),
      getApplicationResultLabel(team.tracking?.application_result || null),
      team.tracking?.notes || '',
    ])

    // Escape CSV values (using semicolon as delimiter for Excel Turkish locale)
    const escapeCSV = (value: string) => {
      if (value.includes(';') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    // Build CSV content with BOM for Excel UTF-8 support
    // Using semicolon (;) as delimiter for Turkish/European Excel
    const BOM = '\uFEFF'
    const csvContent = BOM + [
      headers.map(escapeCSV).join(';'),
      ...rows.map(row => row.map(escapeCSV).join(';'))
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${event.name}_takip_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('noEvent')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (trackingData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">{t('noTeams')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
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
                <TableHead className="min-w-[150px]">{t('schoolName')}</TableHead>
                <TableHead className="min-w-[120px]">{t('teamName')}</TableHead>
                <TableHead className="min-w-[120px]">{t('advisorTeacher')}</TableHead>
                <TableHead className="min-w-[120px]">{t('advisorPhone')}</TableHead>
                <TableHead className="w-[80px] text-center">{t('score')}</TableHead>
                <TableHead className="w-[80px] text-center">{t('viewCanvas')}</TableHead>
                <TableHead className="w-[80px] text-center">{t('juryEvaluations')}</TableHead>
                <TableHead className="min-w-[130px]">{t('projectPath')}</TableHead>
                <TableHead className="min-w-[130px]">{t('incubation')}</TableHead>
                <TableHead className="min-w-[100px]">{t('mentorProject')}</TableHead>
                <TableHead className="min-w-[100px]">{t('mentorDomain')}</TableHead>
                <TableHead className="w-[80px] text-center">{t('applicationSubmitted')}</TableHead>
                <TableHead className="min-w-[120px]">{t('result')}</TableHead>
                <TableHead className="min-w-[200px]">{t('notes')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackingData.map((team, index) => (
                <TableRow key={team.id} className={index < 3 ? 'bg-yellow-50/50' : ''}>
                  {/* School Name */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{team.school_name || '-'}</span>
                    </div>
                  </TableCell>

                  {/* Team Name */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {index < 3 && (
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      )}
                      <span className="font-medium">{team.name}</span>
                    </div>
                  </TableCell>

                  {/* Advisor Teacher */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{team.advisor_teacher || '-'}</span>
                    </div>
                  </TableCell>

                  {/* Advisor Phone */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="05XX XXX XXXX"
                        className="h-8 text-sm w-[130px]"
                        value={getDisplayValue(team.id, 'advisor_phone', team.advisor_phone) || ''}
                        onChange={(e) => updateLocalState(team.id, 'advisor_phone', e.target.value)}
                      />
                    </div>
                  </TableCell>

                  {/* Score */}
                  <TableCell className="text-center">
                    {team.leaderboard_score !== null ? (
                      <Badge variant="secondary" className="font-mono">
                        {team.leaderboard_score.toFixed(1)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Canvas Button */}
                  <TableCell className="text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTeamForCanvas(team)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{team.name} - Canvas</DialogTitle>
                        </DialogHeader>
                        <TeamCanvasViewer team={team} onClose={() => setSelectedTeamForCanvas(null)} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>

                  {/* Jury Evaluations Button */}
                  <TableCell className="text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTeamForJury(team)}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <JuryEvaluationsDialog team={team} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>

                  {/* Project Path */}
                  <TableCell>
                    <Select
                      value={getDisplayValue(team.id, 'project_path', team.tracking?.project_path) || 'none'}
                      onValueChange={(value) => updateLocalState(team.id, 'project_path', value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="h-8 text-sm w-[120px]">
                        <SelectValue placeholder={t('selectProjectPath')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="startup">{t('projectPaths.startup')}</SelectItem>
                        <SelectItem value="tubitak">{t('projectPaths.tubitak')}</SelectItem>
                        <SelectItem value="teknofest">{t('projectPaths.teknofest')}</SelectItem>
                        <SelectItem value="other">{t('projectPaths.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Incubation Status */}
                  <TableCell>
                    <Select
                      value={getDisplayValue(team.id, 'incubation_status', team.tracking?.incubation_status) || 'not_started'}
                      onValueChange={(value) => updateLocalState(team.id, 'incubation_status', value)}
                    >
                      <SelectTrigger className="h-8 text-sm w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">{t('incubationStatus.not_started')}</SelectItem>
                        <SelectItem value="in_progress">{t('incubationStatus.in_progress')}</SelectItem>
                        <SelectItem value="completed">{t('incubationStatus.completed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Mentor Project Expert */}
                  <TableCell>
                    <Input
                      placeholder={t('mentorProject')}
                      className="h-8 text-sm w-[100px]"
                      value={getDisplayValue(team.id, 'mentor_project_expert', team.tracking?.mentor_project_expert) || ''}
                      onChange={(e) => updateLocalState(team.id, 'mentor_project_expert', e.target.value)}
                    />
                  </TableCell>

                  {/* Mentor Domain Expert */}
                  <TableCell>
                    <Input
                      placeholder={t('mentorDomain')}
                      className="h-8 text-sm w-[100px]"
                      value={getDisplayValue(team.id, 'mentor_domain_expert', team.tracking?.mentor_domain_expert) || ''}
                      onChange={(e) => updateLocalState(team.id, 'mentor_domain_expert', e.target.value)}
                    />
                  </TableCell>

                  {/* Application Submitted */}
                  <TableCell className="text-center">
                    <Checkbox
                      checked={getDisplayValue(team.id, 'application_submitted', team.tracking?.application_submitted) || false}
                      onCheckedChange={(checked: boolean) => updateLocalState(team.id, 'application_submitted', checked)}
                    />
                  </TableCell>

                  {/* Application Result */}
                  <TableCell>
                    <Select
                      value={getDisplayValue(team.id, 'application_result', team.tracking?.application_result) || 'none'}
                      onValueChange={(value) => updateLocalState(team.id, 'application_result', value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="h-8 text-sm w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="pending">{t('applicationResult.pending')}</SelectItem>
                        <SelectItem value="accepted">{t('applicationResult.accepted')}</SelectItem>
                        <SelectItem value="rejected">{t('applicationResult.rejected')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Notes */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Textarea
                        placeholder={t('notes')}
                        className="h-8 min-h-[32px] text-sm resize-none"
                        rows={expandedNotes === team.id ? 3 : 1}
                        value={getDisplayValue(team.id, 'notes', team.tracking?.notes) || ''}
                        onChange={(e) => updateLocalState(team.id, 'notes', e.target.value)}
                        onFocus={() => setExpandedNotes(team.id)}
                        onBlur={() => setExpandedNotes(null)}
                      />
                    </div>
                  </TableCell>

                  {/* Save Button */}
                  <TableCell>
                    {hasChanges(team.id) && (
                      <Button
                        size="sm"
                        onClick={() => saveChanges(team.id)}
                        disabled={savingTeamId === team.id}
                      >
                        {savingTeamId === team.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : savedTeamId === team.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {savedTeamId === team.id && !hasChanges(team.id) && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        {t('saved')}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
