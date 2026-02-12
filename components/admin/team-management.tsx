'use client'

import { useState, useEffect } from 'react'
import { Event, Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, FileText, ChevronDown, Crown, UserCircle, Clock, Eye, EyeOff, Key, LayoutGrid, FileDown } from 'lucide-react'
import { TeamCanvasViewer } from './team-canvas-viewer'
import { InvestmentsOverview } from './investments-overview'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslations } from 'next-intl'

interface TeamMember {
  user_id: string
  name: string
  role: string
  is_captain: boolean
  joined_at: string
}

interface TeamManagementProps {
  event: Event | null
  teams: Team[]
  onUpdate: () => void
}

export function TeamManagement({ event, teams, onUpdate }: TeamManagementProps) {
  const t = useTranslations('admin.teamManagement')
  const tForm = useTranslations('admin.teamForm')
  const tCommon = useTranslations('common')
  const [isCreating, setIsCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamTable, setNewTeamTable] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [advisorTeacher, setAdvisorTeacher] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [canvasViewTeam, setCanvasViewTeam] = useState<Team | null>(null)
  const [bulkCount, setBulkCount] = useState('')
  const [isBulkCreating, setIsBulkCreating] = useState(false)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const [personalCodes, setPersonalCodes] = useState<Record<string, Record<string, string>>>({}) // teamId -> userId -> code
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set()) // Set of userId's whose codes are visible
  const supabase = createClient()

  // Real-time subscription for team updates
  useEffect(() => {
    if (!event?.id) return

    const channel = supabase
      .channel('teams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `event_id=eq.${event.id}`
        },
        () => {
          onUpdate() // Refresh teams list
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event?.id, onUpdate, supabase])

  const toggleTeamExpanded = async (teamId: string) => {
    const newExpanded = new Set(expandedTeams)
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId)
    } else {
      newExpanded.add(teamId)
      // Fetch personal codes for this team if not already loaded
      if (!personalCodes[teamId]) {
        await loadPersonalCodes(teamId)
      }
    }
    setExpandedTeams(newExpanded)
  }

  const loadPersonalCodes = async (teamId: string) => {
    try {
      const team = teams.find(t => t.id === teamId)
      if (!team) return

      const members = (team.team_members as TeamMember[]) || []
      const userIds = members.map(m => m.user_id)

      if (userIds.length === 0) return

      // Fetch personal codes from profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, personal_code')
        .in('id', userIds)

      if (error) throw error

      // Build mapping: userId -> personal_code
      const codeMap: Record<string, string> = {}
      data?.forEach(profile => {
        if (profile.personal_code) {
          codeMap[profile.id] = profile.personal_code
        }
      })

      setPersonalCodes(prev => ({
        ...prev,
        [teamId]: codeMap
      }))
    } catch (error) {
      console.error('Failed to load personal codes:', error)
    }
  }

  const toggleCodeVisibility = (userId: string) => {
    const newVisible = new Set(visibleCodes)
    if (newVisible.has(userId)) {
      newVisible.delete(userId)
    } else {
      newVisible.add(userId)
    }
    setVisibleCodes(newVisible)
  }

  const createBulkTeams = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || !bulkCount) return

    const count = parseInt(bulkCount)
    if (count < 1 || count > 50) {
      alert(t('bulkCreate.errorRange'))
      return
    }

    // Check if teams already exist
    if (teams.length > 0) {
      const confirm = window.confirm(
        t('bulkCreate.confirmExisting', { count: teams.length, newCount: count })
      )
      if (!confirm) return
    }

    setIsBulkCreating(true)
    try {
      // Find the highest table number
      const maxTableNumber = teams.length > 0
        ? Math.max(...teams.map(t => t.table_number))
        : 0

      // Generate activation codes and create teams
      const teamsToCreate = []
      for (let i = 1; i <= count; i++) {
        const activationCode = generateActivationCode()
        const tableNumber = maxTableNumber + i
        teamsToCreate.push({
          event_id: event.id,
          name: `Table ${tableNumber}`,
          table_number: tableNumber,
          activation_code: activationCode,
          is_activated: false,
          team_members: [],
        })
      }

      const { error } = await supabase.from('teams').insert(teamsToCreate)

      if (error) throw error

      setBulkCount('')
      onUpdate()
    } catch (error) {
      console.error('Failed to create teams:', error)
      alert(t('bulkCreate.errorCreate'))
    } finally {
      setIsBulkCreating(false)
    }
  }

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return

    setIsCreating(true)
    try {
      const activationCode = generateActivationCode()
      const { error } = await supabase.from('teams').insert({
        event_id: event.id,
        name: newTeamName,
        table_number: parseInt(newTeamTable),
        activation_code: activationCode,
        is_activated: false,
        team_members: [],
        school_name: schoolName.trim() || null,
        advisor_teacher: advisorTeacher.trim() || null,
      })

      if (error) throw error

      setNewTeamName('')
      setNewTeamTable('')
      setSchoolName('')
      setAdvisorTeacher('')
      onUpdate()
    } catch (error) {
      console.error('Failed to create team:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const generateActivationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const printAllQRCodes = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const cardsHtml = teams.map((team) => {
      const joinUrl = `${baseUrl}/join?code=${team.activation_code}`
      // Generate QR code as an image URL using a public API
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&ecc=H`
      return `
        <div class="qr-card">
          <h3>${team.name}</h3>
          <p class="table-num">${t('teamsList.table')} ${team.table_number}</p>
          <div class="qr-wrap">
            <img src="${qrUrl}" alt="QR" width="180" height="180" />
          </div>
          <p class="code-label">${t('teamsList.activationCode')}</p>
          <p class="code">${team.activation_code}</p>
          <p class="url">fikirmaratonu.com/join</p>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
          @page { size: A4; margin: 0.8cm; }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            padding: 10px;
          }
          .qr-card {
            border: 2px solid #333;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .qr-card h3 { font-size: 16px; margin-bottom: 2px; }
          .table-num { font-size: 12px; color: #666; margin-bottom: 6px; }
          .qr-wrap { display: inline-block; padding: 8px; border: 1px solid #ccc; border-radius: 6px; margin-bottom: 6px; }
          .qr-wrap img { display: block; }
          .code-label { font-size: 10px; color: #666; margin-bottom: 2px; }
          .code { font-size: 22px; font-weight: bold; font-family: monospace; letter-spacing: 3px; margin-bottom: 4px; }
          .url { font-size: 9px; color: #888; }
        </style>
      </head>
      <body>
        <div class="grid">${cardsHtml}</div>
        <script>
          // Wait for all QR images to load before printing
          const images = document.querySelectorAll('img');
          let loaded = 0;
          const total = images.length;
          if (total === 0) { window.print(); window.close(); }
          images.forEach(img => {
            if (img.complete) {
              loaded++;
              if (loaded === total) { window.print(); window.close(); }
            } else {
              img.onload = img.onerror = () => {
                loaded++;
                if (loaded === total) { window.print(); window.close(); }
              };
            }
          });
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const joinUrl = selectedTeam
    ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?code=${selectedTeam.activation_code}`
    : ''

  return (
    <div className="space-y-6">
      {/* Bulk Team Creation */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-900">{t('bulkCreate.title')}</CardTitle>
          <CardDescription>{t('bulkCreate.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createBulkTeams} className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="bulkCount">{t('bulkCreate.numberLabel')}</Label>
                <Input
                  id="bulkCount"
                  type="number"
                  min="1"
                  max="50"
                  placeholder={t('bulkCreate.placeholder')}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('bulkCreate.infoText')}
                </p>
              </div>
              <Button type="submit" disabled={isBulkCreating || !event} size="lg">
                {isBulkCreating ? t('bulkCreate.creating') : t('bulkCreate.createButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Single Team Creation */}
      <Card>
        <CardHeader>
          <CardTitle>{t('singleCreate.title')}</CardTitle>
          <CardDescription>{t('singleCreate.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTeam} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">{tForm('teamName')}</Label>
                <Input
                  id="teamName"
                  placeholder={t('singleCreate.teamNamePlaceholder')}
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableNumber">{tForm('tableNumber')}</Label>
                <Input
                  id="tableNumber"
                  type="number"
                  placeholder={t('singleCreate.tableNumberPlaceholder')}
                  value={newTeamTable}
                  onChange={(e) => setNewTeamTable(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">{t('singleCreate.schoolName')}</Label>
                <Input
                  id="schoolName"
                  placeholder={t('singleCreate.schoolNamePlaceholder')}
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advisorTeacher">{t('singleCreate.advisorTeacher')}</Label>
                <Input
                  id="advisorTeacher"
                  placeholder={t('singleCreate.advisorTeacherPlaceholder')}
                  value={advisorTeacher}
                  onChange={(e) => setAdvisorTeacher(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={isCreating || !event}>
              <Plus className="mr-2 h-4 w-4" />
              {tForm('createTeam')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('teamsList.title')} ({teams.length})</CardTitle>
              <CardDescription>{t('teamsList.description')}</CardDescription>
            </div>
            {teams.length > 0 && (
              <Button variant="outline" onClick={() => printAllQRCodes()}>
                {t('teamsList.printAll')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const members = (team.team_members as TeamMember[]) || []
              const isExpanded = expandedTeams.has(team.id)

              return (
                <Card key={team.id} className={team.is_activated ? 'border-green-200 bg-green-50/30' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <CardDescription>
                          {t('teamsList.table')} {team.table_number}
                          {team.school_name && (
                            <span className="block text-xs mt-1">{t('teamsList.school')}: {team.school_name}</span>
                          )}
                          {team.advisor_teacher && (
                            <span className="block text-xs">{t('teamsList.advisor')}: {team.advisor_teacher}</span>
                          )}
                        </CardDescription>
                      </div>
                      {team.is_activated && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{t('teamsList.active')}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Member Count */}
                    <Collapsible open={isExpanded} onOpenChange={() => toggleTeamExpanded(team.id)}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between hover:bg-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{members.length} {members.length !== 1 ? t('teamsList.members') : t('teamsList.member')}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-2 space-y-2">
                        {members.length > 0 ? (
                          <div className="space-y-2 p-2 bg-white/50 rounded-md border">
                            {members.map((member, index) => (
                              <div
                                key={member.user_id || index}
                                className={`p-2 rounded text-xs ${
                                  member.is_captain
                                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                                    : 'bg-slate-50 border border-slate-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    {member.is_captain ? (
                                      <Crown className="h-3.5 w-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <UserCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-900 truncate">{member.name}</p>
                                      <p className="text-slate-600 truncate">{member.role}</p>
                                    </div>
                                  </div>
                                  {member.is_captain && (
                                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded flex-shrink-0">
                                      {t('teamsList.captain')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(member.joined_at).toLocaleString('tr-TR', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</span>
                                </div>
                                {/* Personal Code */}
                                {personalCodes[team.id]?.[member.user_id] && (
                                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                                    <Key className="h-3 w-3 text-purple-600 flex-shrink-0" />
                                    <span className="text-[10px] text-slate-600 font-medium">Code:</span>
                                    <code className="text-[10px] font-mono font-bold text-purple-900 flex-1">
                                      {visibleCodes.has(member.user_id)
                                        ? personalCodes[team.id][member.user_id]
                                        : '••••••'}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 hover:bg-purple-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleCodeVisibility(member.user_id)
                                      }}
                                      title={visibleCodes.has(member.user_id) ? 'Hide code' : 'Show code'}
                                    >
                                      {visibleCodes.has(member.user_id) ? (
                                        <EyeOff className="h-3 w-3 text-purple-600" />
                                      ) : (
                                        <Eye className="h-3 w-3 text-purple-600" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-3 text-xs text-muted-foreground">
                            {t('teamsList.noMembers')}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Activation Code */}
                    <div className="text-sm pt-2 border-t">
                      <p className="text-muted-foreground text-xs">{t('teamsList.activationCode')}</p>
                      <p className="font-mono font-bold">{team.activation_code}</p>
                    </div>

                    {/* Presentation Status */}
                    {team.presentation_url && (
                      <div className="flex items-center justify-between gap-2 text-sm text-green-600 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{t('teamsList.presentationUploaded')}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={team.presentation_url} target="_blank" rel="noopener noreferrer">
                            <FileDown className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    )}

                    {/* QR Code Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setSelectedTeam(team)}
                        >
                          {t('teamsList.showQR')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>{team.name} - {t('qrDialog.joinTitle')}</DialogTitle>
                          <DialogDescription>
                            {t('qrDialog.joinDescription')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center space-y-4">
                          {selectedTeam?.id === team.id && (
                            <>
                              <div className="p-4 bg-white rounded-lg">
                                <QRCodeSVG
                                  value={joinUrl}
                                  size={256}
                                  level="H"
                                  includeMargin
                                />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-mono break-all p-2 bg-muted rounded">
                                  {joinUrl}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* View Canvas Button - Only show for activated teams */}
                    {team.is_activated && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setCanvasViewTeam(team)}
                      >
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        {t('teamsList.viewCanvas')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {teams.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('teamsList.noTeams')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investments Overview */}
      <InvestmentsOverview event={event} teams={teams} />

      {/* Canvas Viewer Dialog */}
      <Dialog open={!!canvasViewTeam} onOpenChange={(open) => !open && setCanvasViewTeam(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('canvasViewer.title')}: {canvasViewTeam?.name}</DialogTitle>
            <DialogDescription>
              {t('teamsList.table')} {canvasViewTeam?.table_number}
            </DialogDescription>
          </DialogHeader>
          {canvasViewTeam && (
            <TeamCanvasViewer team={canvasViewTeam} onClose={() => setCanvasViewTeam(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
