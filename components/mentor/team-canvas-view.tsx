'use client'

import { useState, useEffect } from 'react'
import { Team, MentorFeedbackWithMentor, Profile, CanvasContributionWithUser, TeamDecision } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Lightbulb, Target, Star, Zap, DollarSign, MessageSquare, Send, Loader2, Users, Crown, UserCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TeamCanvasViewProps {
  team: Team
  onClose: () => void
}

type CanvasSection = 'problem' | 'solution' | 'value_proposition' | 'target_audience' | 'key_features' | 'revenue_model'

interface SectionConfig {
  key: CanvasSection
  title: string
  description: string
  icon: React.ReactNode
  color: string
  borderColor: string
  bgColor: string
  iconBgColor: string
}

const sectionConfigs: SectionConfig[] = [
  {
    key: 'problem',
    title: 'Problem',
    description: 'What problem are they solving?',
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
    color: 'text-red-600',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-50',
    iconBgColor: 'bg-red-100',
  },
  {
    key: 'solution',
    title: 'Solution',
    description: 'How does it work?',
    icon: <Lightbulb className="h-5 w-5 text-yellow-600" />,
    color: 'text-yellow-600',
    borderColor: 'border-yellow-400',
    bgColor: 'bg-yellow-50',
    iconBgColor: 'bg-yellow-100',
  },
  {
    key: 'value_proposition',
    title: 'Unique Value',
    description: 'Why choose them?',
    icon: <Star className="h-5 w-5 text-purple-600" />,
    color: 'text-purple-600',
    borderColor: 'border-purple-400',
    bgColor: 'bg-purple-50',
    iconBgColor: 'bg-purple-100',
  },
  {
    key: 'target_audience',
    title: 'Target Customers',
    description: 'Who are they?',
    icon: <Target className="h-5 w-5 text-blue-600" />,
    color: 'text-blue-600',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
    iconBgColor: 'bg-blue-100',
  },
  {
    key: 'key_features',
    title: 'Key Features',
    description: 'Top 3 features',
    icon: <Zap className="h-5 w-5 text-green-600" />,
    color: 'text-green-600',
    borderColor: 'border-green-400',
    bgColor: 'bg-green-50',
    iconBgColor: 'bg-green-100',
  },
  {
    key: 'revenue_model',
    title: 'Revenue Model',
    description: 'How to monetize?',
    icon: <DollarSign className="h-5 w-5 text-orange-600" />,
    color: 'text-orange-600',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-50',
    iconBgColor: 'bg-orange-100',
  },
]

export function TeamCanvasView({ team, onClose }: TeamCanvasViewProps) {
  const supabase = createClient()
  const [feedbacks, setFeedbacks] = useState<MentorFeedbackWithMentor[]>([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true)
  const [selectedSection, setSelectedSection] = useState<CanvasSection | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentMentorId, setCurrentMentorId] = useState<string | null>(null)
  const [contributions, setContributions] = useState<Record<CanvasSection, CanvasContributionWithUser[]>>({
    problem: [],
    solution: [],
    value_proposition: [],
    target_audience: [],
    key_features: [],
    revenue_model: [],
  })
  const [isLoadingContributions, setIsLoadingContributions] = useState(true)
  const [teamDecisions, setTeamDecisions] = useState<Record<CanvasSection, TeamDecision | null>>({
    problem: null,
    solution: null,
    value_proposition: null,
    target_audience: null,
    key_features: null,
    revenue_model: null,
  })

  const members = (team.team_members as any[]) || []
  const canvasData = team.canvas_data || {}

  useEffect(() => {
    loadFeedback()
    getCurrentMentor()
    loadContributions()
    loadTeamDecisions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Real-time subscription for feedback
  useEffect(() => {
    const channel = supabase
      .channel(`feedback-${team.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_feedback',
          filter: `team_id=eq.${team.id}`,
        },
        () => {
          loadFeedback()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [team.id, supabase])

  // Real-time subscription for contributions
  useEffect(() => {
    const channel = supabase
      .channel(`contributions-${team.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_contributions',
          filter: `team_id=eq.${team.id}`,
        },
        () => {
          loadContributions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [team.id, supabase])

  // Real-time subscription for team decisions
  useEffect(() => {
    const channel = supabase
      .channel(`mentor-decisions-${team.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_decisions',
          filter: `team_id=eq.${team.id}`,
        },
        () => {
          loadTeamDecisions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [team.id, supabase])

  const getCurrentMentor = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentMentorId(user.id)
    }
  }

  const loadFeedback = async () => {
    setIsLoadingFeedback(true)
    try {
      const { data, error } = await supabase
        .from('mentor_feedback')
        .select('*, mentor:profiles(*)')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFeedbacks(data || [])
    } catch (error) {
      console.error('Failed to load feedback:', error)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

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
        revenue_model: [],
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
        revenue_model: null,
      }

      ;(data || []).forEach((decision: TeamDecision) => {
        decisionsMap[decision.section as CanvasSection] = decision
      })

      setTeamDecisions(decisionsMap)
    } catch (error) {
      console.error('Failed to load team decisions:', error)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || !selectedSection || !currentMentorId) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('mentor_feedback').insert({
        team_id: team.id,
        mentor_id: currentMentorId,
        canvas_section: selectedSection,
        feedback_text: feedbackText.trim(),
        is_read: false,
      })

      if (error) throw error

      setFeedbackText('')
      setSelectedSection(null)
      loadFeedback()
    } catch (error: any) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFeedbackForSection = (section: CanvasSection) => {
    return feedbacks.filter((f) => f.canvas_section === section)
  }

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-purple-900">{team.name}</CardTitle>
              <CardDescription>Table {team.table_number}</CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-purple-900">Team Members:</p>
            <div className="flex flex-wrap gap-2">
              {members.map((member: any, index: number) => (
                <Badge key={index} variant="outline" className="bg-white">
                  {member.name} - {member.role}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionConfigs.map((config) => {
          const sectionContributions = contributions[config.key] || []
          const sectionFeedback = getFeedbackForSection(config.key)
          const teamDecision = teamDecisions[config.key]

          return (
            <Card
              key={config.key}
              className={`border-l-4 ${teamDecision ? 'border-green-500 ring-2 ring-green-200' : config.borderColor} hover:shadow-lg transition-shadow`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 ${config.iconBgColor} rounded-lg`}>{config.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{config.title}</CardTitle>
                      <CardDescription className="text-xs">{config.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {teamDecision && (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Decision
                      </Badge>
                    )}
                    {sectionContributions.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {sectionContributions.length} ideas
                      </Badge>
                    )}
                    {sectionFeedback.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {sectionFeedback.length} feedback
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
                      <span className="text-sm font-semibold text-green-800">Team Decision</span>
                    </div>
                    <p className="text-sm text-green-900 whitespace-pre-wrap">{teamDecision.content}</p>
                    <p className="text-xs text-green-600 mt-2">
                      Updated: {new Date(teamDecision.updated_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}

                {/* Student Contributions */}
                <div className={`p-3 ${config.bgColor} rounded-md min-h-[120px] max-h-[300px] overflow-y-auto space-y-2`}>
                  {isLoadingContributions ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : sectionContributions.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No contributions yet</p>
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
                                {new Date(contrib.created_at).toLocaleTimeString('en-US', {
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

                {/* Feedback button */}
                <Dialog open={selectedSection === config.key} onOpenChange={(open) => {
                  if (!open) {
                    setSelectedSection(null)
                    setFeedbackText('')
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedSection(config.key)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Give Feedback ({sectionFeedback.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Feedback: {config.title}</DialogTitle>
                      <DialogDescription>
                        Provide guidance through questions to help the team improve this section
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* Team's contributions */}
                      <div>
                        <p className="text-sm font-medium mb-2">Team Ideas ({sectionContributions.length}):</p>
                        <div className={`p-3 ${config.bgColor} rounded-md max-h-48 overflow-y-auto space-y-2`}>
                          {sectionContributions.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No contributions yet</p>
                          ) : (
                            sectionContributions.map((contrib) => (
                              <div
                                key={contrib.id}
                                className="bg-white rounded-md p-2 shadow-sm border border-gray-200"
                              >
                                <div className="flex items-start gap-2">
                                  {contrib.is_captain ? (
                                    <Crown className="h-3 w-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <UserCircle className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900">{contrib.member_name}</p>
                                    <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap break-words">
                                      {contrib.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Previous feedback */}
                      {sectionFeedback.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Previous Feedback:</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {sectionFeedback.map((fb) => (
                              <div
                                key={fb.id}
                                className={`p-3 rounded-md border ${
                                  fb.mentor_id === currentMentorId
                                    ? 'bg-purple-50 border-purple-200'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-xs font-medium">
                                    {fb.mentor?.full_name || 'Mentor'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(fb.created_at).toLocaleString('tr-TR', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{fb.feedback_text}</p>
                                {fb.is_read && (
                                  <p className="text-xs text-green-600 mt-1">✓ Read by team</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New feedback */}
                      <div>
                        <p className="text-sm font-medium mb-2">Add New Feedback:</p>
                        <Textarea
                          placeholder="Ask guiding questions like: 'Have you considered...?', 'What about...?', 'How would you handle...?'"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={4}
                          maxLength={1000}
                        />
                        <p className="text-xs text-right text-muted-foreground mt-1">
                          {feedbackText.length}/1000
                        </p>
                      </div>

                      <Button
                        onClick={handleSubmitFeedback}
                        disabled={!feedbackText.trim() || isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Submit Feedback
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Feedback Summary */}
      <Card>
        <CardHeader>
          <CardTitle>All Feedback</CardTitle>
          <CardDescription>Complete feedback history for this team</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFeedback ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feedback yet. Start guiding the team!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((fb) => {
                const config = sectionConfigs.find((c) => c.key === fb.canvas_section)
                return (
                  <div
                    key={fb.id}
                    className={`p-4 rounded-lg border ${
                      fb.mentor_id === currentMentorId
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {config && <div className={`p-1.5 ${config.iconBgColor} rounded`}>{config.icon}</div>}
                        <div>
                          <p className="text-sm font-medium">{config?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            by {fb.mentor?.full_name || 'Mentor'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(fb.created_at).toLocaleString('tr-TR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {fb.is_read && (
                          <p className="text-xs text-green-600 mt-1">✓ Read</p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{fb.feedback_text}</p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
