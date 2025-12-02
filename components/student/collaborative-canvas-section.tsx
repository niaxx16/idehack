'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CanvasContributionWithUser } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Crown, UserCircle, Trash2 } from 'lucide-react'
import { FeedbackDialog } from './feedback-dialog'

interface TeamMember {
  user_id: string
  name: string
  role: string
  is_captain: boolean
}

interface CollaborativeCanvasSectionProps {
  teamId: string
  currentUserId: string
  section: 'problem' | 'solution' | 'value_proposition' | 'target_audience' | 'key_features' | 'revenue_model'
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
  const [contributions, setContributions] = useState<CanvasContributionWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contributionsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadContributions()
  }, [teamId, section])

  // Real-time subscription
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

  const handleDelete = async (contributionId: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return

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
              {feedbacks.length} feedback
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
              No ideas yet. Be the first to contribute!
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
                              You
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
                          onClick={() => handleDelete(contrib.id)}
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
            maxLength={500}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {newContent.length}/500
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
                  Adding...
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  Add Idea
                </>
              )}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </form>

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
