'use client'

import { Event, Team, CanvasContributionWithUser, TeamDecision, CanvasSection } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Video, Crown, UserCircle, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

// Canvas section translations mapping
const SECTION_LABELS = {
  problem: 'problemStatement',
  solution: 'solution',
  value_proposition: 'uniqueValue',
  target_audience: 'targetCustomers',
  key_features: 'keyFeatures',
  revenue_model: 'revenueModel',
} as const

// Section colors mapping
const SECTION_COLORS = {
  problem: { bg: 'bg-red-50', border: 'border-red-200', indicator: 'bg-red-500' },
  solution: { bg: 'bg-yellow-50', border: 'border-yellow-200', indicator: 'bg-yellow-500' },
  value_proposition: { bg: 'bg-purple-50', border: 'border-purple-200', indicator: 'bg-purple-500' },
  target_audience: { bg: 'bg-blue-50', border: 'border-blue-200', indicator: 'bg-blue-500' },
  key_features: { bg: 'bg-green-50', border: 'border-green-200', indicator: 'bg-green-500' },
  revenue_model: { bg: 'bg-emerald-50', border: 'border-emerald-200', indicator: 'bg-emerald-500' },
} as const

interface StreamViewerProps {
  event: Event
  team: Team
}

export function StreamViewer({ event, team }: StreamViewerProps) {
  const t = useTranslations('jury.streamViewer')
  const [contributions, setContributions] = useState<Record<CanvasSection, CanvasContributionWithUser[]>>({
    problem: [],
    solution: [],
    value_proposition: [],
    target_audience: [],
    key_features: [],
    revenue_model: [],
  })
  const [teamDecisions, setTeamDecisions] = useState<Record<CanvasSection, TeamDecision | null>>({
    problem: null,
    solution: null,
    value_proposition: null,
    target_audience: null,
    key_features: null,
    revenue_model: null,
  })
  const supabase = createClient()

  const members = (team.team_members as any[]) || []

  useEffect(() => {
    loadContributions()
    loadTeamDecisions()
  }, [team.id])

  const loadContributions = async () => {
    try {
      // Load contributions with profile information
      const { data, error } = await supabase
        .from('canvas_contributions')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            display_name,
            role
          )
        `)
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
        revenue_model: [],
      }

      ;(data || []).forEach((contrib: any) => {
        // Get member info from team_members JSON
        const member = members.find((m: any) => m.user_id === contrib.user_id)

        // Use profile info if available, otherwise fallback to member info
        const profile = contrib.profiles
        const memberName = profile?.display_name || profile?.full_name || member?.name || 'Unknown'
        const memberRole = member?.role || 'Student'
        const isCaptain = member?.is_captain || false

        const enriched = {
          ...contrib,
          member_name: memberName,
          member_role: memberRole,
          is_captain: isCaptain,
        }
        grouped[contrib.section as CanvasSection].push(enriched)
      })

      setContributions(grouped)
    } catch (error) {
      console.error('Failed to load contributions:', error)
    }
  }

  const loadTeamDecisions = async () => {
    try {
      const { data, error } = await supabase
        .from('team_decisions')
        .select('*')
        .eq('team_id', team.id)

      if (error) throw error

      const decisions: Record<CanvasSection, TeamDecision | null> = {
        problem: null,
        solution: null,
        value_proposition: null,
        target_audience: null,
        key_features: null,
        revenue_model: null,
      }

      ;(data || []).forEach((decision: TeamDecision) => {
        decisions[decision.section as CanvasSection] = decision
      })

      setTeamDecisions(decisions)
    } catch (error) {
      console.error('Failed to load team decisions:', error)
    }
  }

  const getEmbedUrl = (url: string) => {
    // Convert YouTube watch URL to embed URL
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v')
      return `https://www.youtube.com/embed/${videoId}`
    }
    // Convert YouTube short URL to embed URL
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    // For Zoom or other embeddable URLs, return as is
    return url
  }

  // Render a canvas section
  const renderSection = (section: CanvasSection) => {
    const colors = SECTION_COLORS[section]
    const decision = teamDecisions[section]
    const sectionContributions = contributions[section]
    const labelKey = SECTION_LABELS[section]

    return (
      <div key={section}>
        <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
          <div className={`w-1 h-4 ${colors.indicator} rounded`}></div>
          {t(labelKey)}
        </h4>
        {decision ? (
          <div className="bg-green-50 border-2 border-green-400 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-xs font-semibold text-green-700">{t('teamDecision')}</span>
            </div>
            <p className="text-sm font-medium">{decision.content}</p>
          </div>
        ) : sectionContributions.length > 0 ? (
          <div className="space-y-2">
            {sectionContributions.map((contrib) => (
              <div key={contrib.id} className={`${colors.bg} border ${colors.border} rounded p-2`}>
                <div className="flex items-center gap-1 mb-1">
                  {contrib.is_captain ? (
                    <Crown className="h-3 w-3 text-yellow-600" />
                  ) : (
                    <UserCircle className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="text-xs font-medium">{contrib.member_name}</span>
                  <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                </div>
                <p className="text-sm">{contrib.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t('noIdeasYet')}</p>
        )}
      </div>
    )
  }

  const sections: CanvasSection[] = ['problem', 'solution', 'value_proposition', 'target_audience', 'key_features', 'revenue_model']

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-2">{t('nowPitching')}</Badge>
              <CardTitle className="text-2xl">{team.name}</CardTitle>
              <CardDescription>{t('table')} {team.table_number}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {event.stream_url ? (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={getEmbedUrl(event.stream_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <Button
                variant="outline"
                onClick={() => window.open(event.stream_url!, '_blank')}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('openInNewTab')}
              </Button>
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-3">
                <Video className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('noStreamUrl')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('projectCanvas')}</CardTitle>
          <CardDescription>{t('teamDecisionsHighlighted')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map(renderSection)}

          {team.presentation_url && (
            <Button
              variant="outline"
              onClick={() => window.open(team.presentation_url!, '_blank')}
              className="w-full mt-4"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('viewPresentation')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
