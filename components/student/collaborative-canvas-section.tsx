'use client'

import { useState, useEffect, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { CanvasContributionWithUser, TeamDecision } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Crown, UserCircle, Trash2, CheckCircle, Edit3, Save } from 'lucide-react'
import { FeedbackDialog } from './feedback-dialog'
import { useTranslations } from 'next-intl'

interface TeamMember {
  user_id: string
  name: string
  role: string
  is_captain: boolean
}

interface CollaborativeCanvasSectionProps {
  teamId: string
  currentUserId: string
  section: 'problem' | 'solution' | 'value_proposition' | 'target_audience' | 'key_features' | 'evidence' | 'pilot_plan' | 'success_metrics' | 'resources_risks'
  title: string
  description: string
  placeholder: string
  icon: React.ReactNode
  colorClasses: {
    border: string
    bg: string
    iconBg: string
    badgeBg: string
  }
  teamMembers: TeamMember[]
  feedbacks?: any[]
  onMarkFeedbackAsRead?: (feedbackId: string) => void
}

export function CollaborativeCanvasSection({
  teamId,
  currentUserId,
  section,
  title,
  description,
  placeholder,
  icon,
  colorClasses,
  teamMembers,
  feedbacks = [],
  onMarkFeedbackAsRead,
}: CollaborativeCanvasSectionProps) {
  const supabase = createClient()
  const t = useTranslations('student')
  const [contributions, setContributions] = useState<CanvasContributionWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contributionsEndRef = useRef<HTMLDivElement>(null)

  // Team Decision states
  const [teamDecision, setTeamDecision] = useState<TeamDecision | null>(null)
  const [decisionContent, setDecisionContent] = useState('')
  const [isEditingDecision, setIsEditingDecision] = useState(false)
  const [isSavingDecision, setIsSavingDecision] = useState(false)

  // Channel ref for broadcasting decisions
  const decisionChannelRef = useRef<RealtimeChannel | null>(null)

  // Check if current user is captain
  const isCaptain = teamMembers.find(m => m.user_id === currentUserId)?.is_captain || false

  useEffect(() => {
    loadContributions()
    loadTeamDecision()
  }, [teamId, section])

  // Real-time subscription for contributions
  useEffect(() => {
    const channel = supabase
      .channel(`contributions-${teamId}-${section}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_contributions',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          // Reload contributions when changes occur
          if (payload.new && (payload.new as any).section === section) {
            loadContributions()
          }
          if (payload.eventType === 'DELETE' && (payload.old as any).section === section) {
            loadContributions()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, section, supabase])

  // Real-time subscription for team decisions via broadcast + postgres_changes
  useEffect(() => {
    const channel = supabase
      .channel(`decisions-broadcast-${teamId}-${section}`)
      .on('broadcast', { event: 'decision_updated' }, () => {
        loadTeamDecision()
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_decisions',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).section === section) {
            loadTeamDecision()
          }
        }
      )
      .subscribe()

    decisionChannelRef.current = channel

    return () => {
      decisionChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [teamId, section, supabase])

  const loadContributions = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('canvas_contributions')
        .select('*')
        .eq('team_id', teamId)
        .eq('section', section)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Enrich with team member info
      const enriched = (data || []).map((contrib) => {
        const member = teamMembers.find((m) => m.user_id === contrib.user_id)
        return {
          ...contrib,
          member_name: member?.name || 'Unknown',
          member_role: member?.role || 'Student',
          is_captain: member?.is_captain || false,
        }
      })

      setContributions(enriched)
    } catch (err: any) {
      console.error('Failed to load contributions:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTeamDecision = async () => {
    try {
      const { data, error } = await supabase
        .from('team_decisions')
        .select('*')
        .eq('team_id', teamId)
        .eq('section', section)
        .maybeSingle()

      if (error) throw error

      setTeamDecision(data)
      if (data) {
        setDecisionContent(data.content)
      }
    } catch (err: any) {
      console.error('Failed to load team decision:', err)
    }
  }

  const handleSaveDecision = async () => {
    if (!decisionContent.trim()) return

    setIsSavingDecision(true)
    try {
      if (teamDecision) {
        // Update existing decision
        const { error } = await supabase
          .from('team_decisions')
          .update({
            content: decisionContent.trim(),
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', teamDecision.id)

        if (error) throw error
      } else {
        // Insert new decision
        const { error } = await supabase
          .from('team_decisions')
          .insert({
            team_id: teamId,
            section: section,
            content: decisionContent.trim(),
            updated_by: currentUserId,
          })

        if (error) throw error
      }

      await loadTeamDecision()
      setIsEditingDecision(false)

      // Broadcast to other team members so they get the update in realtime
      decisionChannelRef.current?.send({
        type: 'broadcast',
        event: 'decision_updated',
        payload: { section },
      })
    } catch (err: any) {
      console.error('Failed to save team decision:', err)
      alert('Failed to save team decision. Please try again.')
    } finally {
      setIsSavingDecision(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('add_canvas_contribution', {
        section_input: section,
        content_input: newContent.trim(),
      })

      if (error) throw error

      setNewContent('')
      await loadContributions()

      // Scroll to bottom to show new contribution
      setTimeout(() => {
        contributionsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err: any) {
      console.error('Failed to add contribution:', err)
      setError(err.message || 'Failed to add your idea. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (contributionId: string, confirmMessage: string) => {
    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('canvas_contributions')
        .delete()
        .eq('id', contributionId)

      if (error) throw error

      await loadContributions()
    } catch (err: any) {
      console.error('Failed to delete contribution:', err)
      alert('Failed to delete. Please try again.')
    }
  }

  return (
    <Card className={`${colorClasses.border} hover:shadow-lg transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 ${colorClasses.iconBg} rounded-lg`}>{icon}</div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          {feedbacks && feedbacks.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {feedbacks.length} {t('canvas.feedback')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contributions List */}
        <div className={`${colorClasses.bg} rounded-lg p-3 space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contributions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground italic">
              {t('canvas.noIdeas')}
            </div>
          ) : (
            <>
              {contributions.map((contrib) => (
                <div
                  key={contrib.id}
                  className={`bg-white rounded-md p-3 shadow-sm border ${
                    contrib.user_id === currentUserId
                      ? 'border-blue-200 bg-blue-50/50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {contrib.is_captain ? (
                        <Crown className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                      ) : (
                        <UserCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {contrib.member_name}
                          </p>
                          {contrib.user_id === currentUserId && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {t('canvas.you')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">{contrib.member_role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] text-gray-400">
                        {new Date(contrib.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {contrib.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(contrib.id, t('canvas.confirmDelete'))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {contrib.content}
                  </p>
                </div>
              ))}
              <div ref={contributionsEndRef} />
            </>
          )}
        </div>

        {/* Add New Contribution */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder={placeholder}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            className="resize-none text-sm"
            maxLength={1000}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {newContent.length}/1000
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={!newContent.trim() || isSubmitting}
              className="gap-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('canvas.adding')}
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  {t('canvas.addIdea')}
                </>
              )}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </form>

        {/* Team Decision Section */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h4 className="text-sm font-semibold text-gray-900">{t('canvas.teamDecision')}</h4>
              {isCaptain && (
                <Badge variant="outline" className="text-[10px] bg-yellow-50 border-yellow-300 text-yellow-700">
                  {t('canvas.captain')}
                </Badge>
              )}
            </div>
            {isCaptain && !isEditingDecision && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setIsEditingDecision(true)}
              >
                <Edit3 className="h-3 w-3" />
                {teamDecision ? t('canvas.edit') : t('canvas.writeDecision')}
              </Button>
            )}
          </div>

          {isEditingDecision && isCaptain ? (
            <div className="space-y-2">
              <Textarea
                placeholder={t('canvas.decisionPlaceholder')}
                value={decisionContent}
                onChange={(e) => setDecisionContent(e.target.value)}
                rows={4}
                className="resize-none text-sm border-green-200 focus:border-green-400"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {decisionContent.length}/1000
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setIsEditingDecision(false)
                      setDecisionContent(teamDecision?.content || '')
                    }}
                  >
                    {t('canvas.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                    onClick={handleSaveDecision}
                    disabled={!decisionContent.trim() || isSavingDecision}
                  >
                    {isSavingDecision ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('canvas.savingDecision')}
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3" />
                        {t('canvas.save')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : teamDecision ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                {teamDecision.content}
              </p>
              <p className="text-[10px] text-green-600 mt-2">
                {t('canvas.lastUpdated')} {new Date(teamDecision.updated_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isCaptain
                  ? t('canvas.noDecisionCaptain')
                  : t('canvas.noDecisionMember')}
              </p>
            </div>
          )}
        </div>

        {/* Mentor Feedback */}
        {feedbacks && onMarkFeedbackAsRead && (
          <FeedbackDialog
            sectionKey={section}
            sectionTitle={title}
            sectionColor={colorClasses.border.replace('border-l-4 border-', '').replace('-400', '')}
            feedbacks={feedbacks}
            onMarkAsRead={onMarkFeedbackAsRead}
          />
        )}
      </CardContent>
    </Card>
  )
}
