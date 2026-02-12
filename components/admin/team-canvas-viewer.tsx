'use client'

import { useState, useEffect } from 'react'
import { Team, CanvasContributionWithUser, TeamDecision } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Lightbulb, Target, Star, Zap, Search, FlaskConical, BarChart3, ShieldAlert, Loader2, Users, Crown, UserCircle, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TeamCanvasViewerProps {
  team: Team
  onClose: () => void
}

type CanvasSection = 'problem' | 'solution' | 'value_proposition' | 'target_audience' | 'key_features' | 'evidence' | 'pilot_plan' | 'success_metrics' | 'resources_risks'

interface SectionConfig {
  key: CanvasSection
  titleKey: string
  descKey: string
  icon: React.ReactNode
  color: string
  borderColor: string
  bgColor: string
  iconBgColor: string
}

const sectionConfigs: SectionConfig[] = [
  {
    key: 'problem',
    titleKey: 'problem',
    descKey: 'problemDesc',
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
    color: 'text-red-600',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-50',
    iconBgColor: 'bg-red-100',
  },
  {
    key: 'solution',
    titleKey: 'solution',
    descKey: 'solutionDesc',
    icon: <Lightbulb className="h-5 w-5 text-yellow-600" />,
    color: 'text-yellow-600',
    borderColor: 'border-yellow-400',
    bgColor: 'bg-yellow-50',
    iconBgColor: 'bg-yellow-100',
  },
  {
    key: 'value_proposition',
    titleKey: 'uniqueValue',
    descKey: 'uniqueValueDesc',
    icon: <Star className="h-5 w-5 text-purple-600" />,
    color: 'text-purple-600',
    borderColor: 'border-purple-400',
    bgColor: 'bg-purple-50',
    iconBgColor: 'bg-purple-100',
  },
  {
    key: 'target_audience',
    titleKey: 'targetUsers',
    descKey: 'targetUsersDesc',
    icon: <Target className="h-5 w-5 text-blue-600" />,
    color: 'text-blue-600',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
    iconBgColor: 'bg-blue-100',
  },
  {
    key: 'evidence',
    titleKey: 'evidence',
    descKey: 'evidenceDesc',
    icon: <Search className="h-5 w-5 text-cyan-600" />,
    color: 'text-cyan-600',
    borderColor: 'border-cyan-400',
    bgColor: 'bg-cyan-50',
    iconBgColor: 'bg-cyan-100',
  },
  {
    key: 'key_features',
    titleKey: 'keyFeatures',
    descKey: 'keyFeaturesDesc',
    icon: <Zap className="h-5 w-5 text-green-600" />,
    color: 'text-green-600',
    borderColor: 'border-green-400',
    bgColor: 'bg-green-50',
    iconBgColor: 'bg-green-100',
  },
  {
    key: 'pilot_plan',
    titleKey: 'pilotPlan',
    descKey: 'pilotPlanDesc',
    icon: <FlaskConical className="h-5 w-5 text-orange-600" />,
    color: 'text-orange-600',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-50',
    iconBgColor: 'bg-orange-100',
  },
  {
    key: 'success_metrics',
    titleKey: 'successMetrics',
    descKey: 'successMetricsDesc',
    icon: <BarChart3 className="h-5 w-5 text-indigo-600" />,
    color: 'text-indigo-600',
    borderColor: 'border-indigo-400',
    bgColor: 'bg-indigo-50',
    iconBgColor: 'bg-indigo-100',
  },
  {
    key: 'resources_risks',
    titleKey: 'resourcesRisks',
    descKey: 'resourcesRisksDesc',
    icon: <ShieldAlert className="h-5 w-5 text-rose-600" />,
    color: 'text-rose-600',
    borderColor: 'border-rose-400',
    bgColor: 'bg-rose-50',
    iconBgColor: 'bg-rose-100',
  },
]

export function TeamCanvasViewer({ team, onClose }: TeamCanvasViewerProps) {
  const supabase = createClient()
  const t = useTranslations('admin.teamManagement')
  const tCanvas = useTranslations('mentor.canvas')
  const [contributions, setContributions] = useState<Record<CanvasSection, CanvasContributionWithUser[]>>({
    problem: [],
    solution: [],
    value_proposition: [],
    target_audience: [],
    key_features: [],
    evidence: [],
    pilot_plan: [],
    success_metrics: [],
    resources_risks: [],
  })
  const [isLoadingContributions, setIsLoadingContributions] = useState(true)
  const [teamDecisions, setTeamDecisions] = useState<Record<CanvasSection, TeamDecision | null>>({
    problem: null,
    solution: null,
    value_proposition: null,
    target_audience: null,
    key_features: null,
    evidence: null,
    pilot_plan: null,
    success_metrics: null,
    resources_risks: null,
  })

  const members = (team.team_members as any[]) || []

  useEffect(() => {
    loadContributions()
    loadTeamDecisions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadContributions = async () => {
    setIsLoadingContributions(true)
    try {
      const { data, error } = await supabase
        .from('canvas_contributions')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by section and enrich with member info
      const grouped: Record<CanvasSection, CanvasContributionWithUser[]> = {
        problem: [],
        solution: [],
        value_proposition: [],
        target_audience: [],
        key_features: [],
        evidence: [],
        pilot_plan: [],
        success_metrics: [],
        resources_risks: [],
      }

      ;(data || []).forEach((contrib) => {
        const member = members.find((m: any) => m.user_id === contrib.user_id)
        const enriched = {
          ...contrib,
          member_name: member?.name || 'Unknown',
          member_role: member?.role || 'Student',
          is_captain: member?.is_captain || false,
        }
        grouped[contrib.section as CanvasSection].push(enriched)
      })

      setContributions(grouped)
    } catch (error) {
      console.error('Failed to load contributions:', error)
    } finally {
      setIsLoadingContributions(false)
    }
  }

  const loadTeamDecisions = async () => {
    try {
      const { data, error } = await supabase
        .from('team_decisions')
        .select('*')
        .eq('team_id', team.id)

      if (error) throw error

      const decisionsMap: Record<CanvasSection, TeamDecision | null> = {
        problem: null,
        solution: null,
        value_proposition: null,
        target_audience: null,
        key_features: null,
        evidence: null,
        pilot_plan: null,
        success_metrics: null,
        resources_risks: null,
      }

      ;(data || []).forEach((decision: TeamDecision) => {
        decisionsMap[decision.section as CanvasSection] = decision
      })

      setTeamDecisions(decisionsMap)
    } catch (error) {
      console.error('Failed to load team decisions:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-blue-900">{team.name}</CardTitle>
              <CardDescription>{t('teamsList.table')} {team.table_number}</CardDescription>
              {team.school_name && (
                <p className="text-sm text-blue-700 mt-1">{t('teamsList.school')}: {team.school_name}</p>
              )}
              {team.advisor_teacher && (
                <p className="text-sm text-blue-700">{t('teamsList.advisor')}: {team.advisor_teacher}</p>
              )}
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {members.length} {members.length !== 1 ? t('teamsList.members') : t('teamsList.member')}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Canvas Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionConfigs.map((config) => {
          const sectionContributions = contributions[config.key] || []
          const teamDecision = teamDecisions[config.key]

          return (
            <Card
              key={config.key}
              className={`border-l-4 ${teamDecision ? 'border-green-500 ring-2 ring-green-200' : config.borderColor}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 ${config.iconBgColor} rounded-lg`}>{config.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{tCanvas(config.titleKey)}</CardTitle>
                      <CardDescription className="text-xs">{tCanvas(config.descKey)}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {teamDecision && (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('canvasViewer.teamDecision')}
                      </Badge>
                    )}
                    {sectionContributions.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {sectionContributions.length} {t('canvasViewer.ideas')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Team Decision - Highlighted at top */}
                {teamDecision && (
                  <div className="p-3 bg-green-50 border-2 border-green-400 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">{t('canvasViewer.teamDecision')}</span>
                    </div>
                    <p className="text-sm text-green-900 whitespace-pre-wrap">{teamDecision.content}</p>
                    <p className="text-xs text-green-600 mt-2">
                      {t('canvasViewer.updated')}: {new Date(teamDecision.updated_at).toLocaleString('tr-TR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}

                {/* Student Contributions */}
                <div className={`p-3 ${config.bgColor} rounded-md min-h-[100px] max-h-[250px] overflow-y-auto space-y-2`}>
                  {isLoadingContributions ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : sectionContributions.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">{t('canvasViewer.noContributions')}</p>
                  ) : (
                    sectionContributions.map((contrib) => (
                      <div
                        key={contrib.id}
                        className="bg-white rounded-md p-2 shadow-sm border border-gray-200"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          {contrib.is_captain ? (
                            <Crown className="h-3 w-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <UserCircle className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-gray-900">{contrib.member_name}</p>
                                <p className="text-[10px] text-gray-500">{contrib.member_role}</p>
                              </div>
                              <p className="text-[10px] text-gray-400 flex-shrink-0">
                                {new Date(contrib.created_at).toLocaleTimeString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap break-words">
                              {contrib.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
