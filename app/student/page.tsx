'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Event, Team, Profile, MentorFeedbackWithMentor } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PitchViewer } from '@/components/student/pitch-viewer'
import { NotesManager } from '@/components/student/notes-manager'
import { PortfolioVoting } from '@/components/student/portfolio-voting'
import { FeedbackDialog } from '@/components/student/feedback-dialog'
import { CollaborativeCanvasSection } from '@/components/student/collaborative-canvas-section'
import { PresentationUpload } from '@/components/team/presentation-upload'
import { CanvasPdfExport } from '@/components/student/canvas-pdf-export'
import { CanvasContributionWithUser, TeamDecision } from '@/types'
import { Loader2, Users, Crown, FileText, Upload, LogOut, AlertCircle, Lightbulb, Target, Star, Zap, Search, FlaskConical, BarChart3, ShieldAlert, Save, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-provider'
import { Locale } from '@/lib/i18n/config'
import { useTranslations } from 'next-intl'

interface TeamMember {
  user_id: string
  name: string
  role: string
  is_captain: boolean
  joined_at: string
}

export default function StudentPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setLocale } = useLanguage()
  const t = useTranslations('student')
  const tCommon = useTranslations('common')

  const [isLoading, setIsLoading] = useState(true)
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isCaptain, setIsCaptain] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Update language when event changes
  useEffect(() => {
    if (currentEvent?.language) {
      setLocale(currentEvent.language as Locale)
    }
  }, [currentEvent?.language, setLocale])

  // Presentation upload state
  const [presentationFile, setPresentationFile] = useState<File | null>(null)
  const [isUploadingPresentation, setIsUploadingPresentation] = useState(false)
  const [presentationSignedUrl, setPresentationSignedUrl] = useState<string | null>(null)

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<MentorFeedbackWithMentor[]>([])

  // Canvas data for PDF export
  const [allContributions, setAllContributions] = useState<Record<string, CanvasContributionWithUser[]>>({})
  const [allTeamDecisions, setAllTeamDecisions] = useState<Record<string, TeamDecision | null>>({})

  useEffect(() => {
    loadData()
  }, [])

  // Real-time event subscription
  useEffect(() => {
    if (!currentEvent?.id) return

    const channel = supabase
      .channel(`student-event-${currentEvent.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${currentEvent.id}`,
        },
        (payload) => {
          if (payload.new) {
            console.log('[StudentPage] realtime event update:', { current_team_id: (payload.new as any).current_team_id, status: (payload.new as any).status })
            setCurrentEvent(payload.new as Event)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentEvent?.id, supabase])

  // Fallback sync for cases where realtime updates are delayed/missed.
  useEffect(() => {
    if (!currentEvent?.id) return

    let isMounted = true
    const syncEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', currentEvent.id)
        .single()

      if (!error && data && isMounted) {
        setCurrentEvent(data)
      }
    }

    // Periodic refresh as fallback for missed realtime updates.
    const interval = setInterval(syncEvent, 15000)
    const onFocus = () => {
      syncEvent()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [currentEvent?.id, supabase])

  // Real-time feedback subscription
  useEffect(() => {
    if (!team?.id) return

    const channel = supabase
      .channel(`student-feedback-${team.id}`)
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
  }, [team?.id, supabase])

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/join')
        return
      }

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // If no team, redirect to join
      if (!profileData.team_id) {
        router.push('/join')
        return
      }

      setProfile(profileData)

      // Get team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profileData.team_id)
        .single()

      if (teamError) throw teamError
      setTeam(teamData)

      // Load event from team's event_id to ensure strict event isolation
      if (teamData.event_id) {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', teamData.event_id)
          .single()

        if (eventError) throw eventError
        setCurrentEvent(eventData)
      } else {
        setCurrentEvent(null)
      }

      // Set current user ID
      setCurrentUserId(user.id)

      // Set members
      setMembers(teamData.team_members || [])

      // Check if current user is captain
      setIsCaptain(teamData.captain_id === user.id)

      // Generate signed URL for presentation if exists
      if (teamData.presentation_url) {
        // Extract file path if full URL is stored
        let filePath = teamData.presentation_url
        if (filePath.includes('/team-presentations/')) {
          filePath = filePath.split('/team-presentations/').pop() || filePath
        }

        const { data: signedUrlData } = await supabase.storage
          .from('team-presentations')
          .createSignedUrl(filePath, 3600) // 1 hour expiry

        if (signedUrlData) {
          setPresentationSignedUrl(signedUrlData.signedUrl)
        }
      }

      // Load feedback
      await loadFeedback()
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFeedback = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single()

      if (!profileData?.team_id) return

      const { data, error } = await supabase
        .from('mentor_feedback')
        .select('*, mentor:profiles(*)')
        .eq('team_id', profileData.team_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setFeedbacks(data || [])
    } catch (error) {
      console.error('Failed to load feedback:', error)
    }
  }

  const markFeedbackAsRead = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('mentor_feedback')
        .update({ is_read: true })
        .eq('id', feedbackId)

      if (error) throw error

      loadFeedback()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const getFeedbackForSection = (section: string) => {
    return feedbacks.filter((f) => f.canvas_section === section)
  }

  // Load all canvas data for PDF export
  const loadCanvasDataForExport = async () => {
    if (!team?.id) return

    try {
      // Load contributions
      const { data: contribData } = await supabase
        .from('canvas_contributions')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: true })

      const grouped: Record<string, CanvasContributionWithUser[]> = {
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

      ;(contribData || []).forEach((contrib) => {
        const member = members.find((m) => m.user_id === contrib.user_id)
        const enriched = {
          ...contrib,
          member_name: member?.name || 'Unknown',
          member_role: member?.role || 'Student',
          is_captain: member?.is_captain || false,
        }
        if (grouped[contrib.section]) {
          grouped[contrib.section].push(enriched)
        }
      })

      setAllContributions(grouped)

      // Load team decisions
      const { data: decisionsData } = await supabase
        .from('team_decisions')
        .select('*')
        .eq('team_id', team.id)

      const decisionsMap: Record<string, TeamDecision | null> = {
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

      ;(decisionsData || []).forEach((decision: TeamDecision) => {
        decisionsMap[decision.section] = decision
      })

      setAllTeamDecisions(decisionsMap)
    } catch (error) {
      console.error('Failed to load canvas data for export:', error)
    }
  }

  // Load canvas data when team is available
  useEffect(() => {
    if (team?.id && members.length > 0) {
      loadCanvasDataForExport()
    }
  }, [team?.id, members])

  const handlePresentationUpload = async () => {
    if (!presentationFile || !team) return

    setIsUploadingPresentation(true)
    try {
      const fileExt = presentationFile.name.split('.').pop()
      const fileName = `presentation-${Date.now()}.${fileExt}`
      // File path format: {team_id}/{filename} for RLS policy
      const filePath = `${team.id}/${fileName}`

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('team-presentations')
        .upload(filePath, presentationFile, {
          upsert: true // Allow replacing existing file
        })

      if (uploadError) throw uploadError

      // Update team with file path (not public URL, will generate signed URL when viewing)
      const { error: updateError } = await supabase
        .from('teams')
        .update({ presentation_url: filePath })
        .eq('id', team.id)

      if (updateError) throw updateError

      // Generate signed URL for viewing
      const { data: signedUrlData } = await supabase.storage
        .from('team-presentations')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      setTeam({ ...team, presentation_url: filePath })
      if (signedUrlData) {
        setPresentationSignedUrl(signedUrlData.signedUrl)
      }
      setPresentationFile(null)
      alert('Presentation uploaded successfully!')
    } catch (error: any) {
      console.error('Upload presentation error:', error)
      alert(error.message || 'Failed to upload presentation. Please try again.')
    } finally {
      setIsUploadingPresentation(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!team || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('noTeamFound')}</p>
      </div>
    )
  }

  const isPitching = currentEvent?.status === 'PITCHING'
  const canVote = currentEvent?.status === 'VOTING'
  const isIdeation = currentEvent?.status === 'IDEATION'
  const isWaiting = currentEvent?.status === 'WAITING'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {team.name}
            </h1>
            <p className="text-muted-foreground">{t('table')} {team.table_number}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(profile?.display_name || profile?.full_name) && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                  <Users className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-900 font-medium">
                    {profile.display_name || profile.full_name}
                  </span>
                  {isCaptain && (
                    <span className="inline-flex items-center gap-0.5 ml-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                      <Crown className="h-2.5 w-2.5" />
                      {t('captain')}
                    </span>
                  )}
                </div>
              )}
              {profile?.personal_code && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 border border-purple-300 rounded-lg">
                  <span className="text-xs text-purple-900">
                    {t('yourCode')}: <span className="font-mono font-bold">{profile.personal_code}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {tCommon('signOut')}
          </Button>
        </div>

        {/* Phase-based content */}
        {isWaiting ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('welcome')} {team.name}!</CardTitle>
              <CardDescription>
                {t('waitingForEvent')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-purple-600" />
                <p className="text-muted-foreground">
                  {t('waitingMessage')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isIdeation ? (
          <Tabs defaultValue="canvas" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="canvas">{t('tabs.canvas')}</TabsTrigger>
              <TabsTrigger value="team">{t('tabs.team')}</TabsTrigger>
              <TabsTrigger value="presentation">{t('tabs.presentation')}</TabsTrigger>
            </TabsList>

            {/* Canvas Tab */}
            <TabsContent value="canvas">
              <div className="space-y-4">
                {/* Header */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-purple-900">{t('collaborativeCanvas')}</h3>
                        <p className="text-sm text-purple-700">{t('canvasDescription')}</p>
                      </div>
                      {team && (
                        <CanvasPdfExport
                          teamName={team.name}
                          contributions={allContributions}
                          teamDecisions={allTeamDecisions}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Canvas Grid - New Collaborative Sections */}
                {currentUserId && team && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Problem */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="problem"
                      title={t('canvas.problem')}
                      description={t('canvas.problemDesc')}
                      placeholder={t('canvas.problemPlaceholder')}
                      icon={<AlertCircle className="h-5 w-5 text-red-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-red-400',
                        bg: 'bg-red-50',
                        iconBg: 'bg-red-100',
                        badgeBg: 'bg-red-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('problem')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />

                    {/* Solution */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="solution"
                      title={t('canvas.solution')}
                      description={t('canvas.solutionDesc')}
                      placeholder={t('canvas.solutionPlaceholder')}
                      icon={<Lightbulb className="h-5 w-5 text-yellow-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-yellow-400',
                        bg: 'bg-yellow-50',
                        iconBg: 'bg-yellow-100',
                        badgeBg: 'bg-yellow-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('solution')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />

                    {/* Unique Value Proposition */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="value_proposition"
                      title={t('canvas.uniqueValue')}
                      description={t('canvas.uniqueValueDesc')}
                      placeholder={t('canvas.uniqueValuePlaceholder')}
                      icon={<Star className="h-5 w-5 text-purple-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-purple-400',
                        bg: 'bg-purple-50',
                        iconBg: 'bg-purple-100',
                        badgeBg: 'bg-purple-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('value_proposition')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />

                    {/* Target Customers */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="target_audience"
                      title={t('canvas.targetAudience')}
                      description={t('canvas.targetAudienceDesc')}
                      placeholder={t('canvas.targetAudiencePlaceholder')}
                      icon={<Target className="h-5 w-5 text-blue-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-blue-400',
                        bg: 'bg-blue-50',
                        iconBg: 'bg-blue-100',
                        badgeBg: 'bg-blue-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('target_audience')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />

                    {/* Key Features */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="key_features"
                      title={t('canvas.keyFeatures')}
                      description={t('canvas.keyFeaturesDesc')}
                      placeholder={t('canvas.keyFeaturesPlaceholder')}
                      icon={<Zap className="h-5 w-5 text-green-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-green-400',
                        bg: 'bg-green-50',
                        iconBg: 'bg-green-100',
                        badgeBg: 'bg-green-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('key_features')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />

                    {/* Evidence / Insight */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="evidence"
                      title={t('canvas.evidence')}
                      description={t('canvas.evidenceDesc')}
                      placeholder={t('canvas.evidencePlaceholder')}
                      icon={<Search className="h-5 w-5 text-cyan-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-cyan-400',
                        bg: 'bg-cyan-50',
                        iconBg: 'bg-cyan-100',
                        badgeBg: 'bg-cyan-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('evidence')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />

                    {/* Pilot Plan */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="pilot_plan"
                      title={t('canvas.pilotPlan')}
                      description={t('canvas.pilotPlanDesc')}
                      placeholder={t('canvas.pilotPlanPlaceholder')}
                      icon={<FlaskConical className="h-5 w-5 text-orange-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-orange-400',
                        bg: 'bg-orange-50',
                        iconBg: 'bg-orange-100',
                        badgeBg: 'bg-orange-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('pilot_plan')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />

                    {/* Success Metrics */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="success_metrics"
                      title={t('canvas.successMetrics')}
                      description={t('canvas.successMetricsDesc')}
                      placeholder={t('canvas.successMetricsPlaceholder')}
                      icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-indigo-400',
                        bg: 'bg-indigo-50',
                        iconBg: 'bg-indigo-100',
                        badgeBg: 'bg-indigo-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('success_metrics')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />

                    {/* Resources & Risks */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="resources_risks"
                      title={t('canvas.resourcesRisks')}
                      description={t('canvas.resourcesRisksDesc')}
                      placeholder={t('canvas.resourcesRisksPlaceholder')}
                      icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-rose-400',
                        bg: 'bg-rose-50',
                        iconBg: 'bg-rose-100',
                        badgeBg: 'bg-rose-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('resources_risks')}
                      onMarkFeedbackAsRead={markFeedbackAsRead}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>{t('teamMembers')} ({members.length})</CardTitle>
                  <CardDescription>
                    {t('teamComposition')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {members.map((member, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          member.is_captain ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{member.name}</h3>
                              {member.is_captain && (
                                <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                  <Crown className="h-3 w-3" />
                                  {t('captain')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('joined')} {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}

                    {members.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t('noTeamMembers')}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground text-center">
                        {t('shareActivationCode')} <br />
                        <span className="text-lg font-mono font-bold text-purple-600">{team.activation_code}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Presentation Tab */}
            <TabsContent value="presentation">
              <PresentationUpload
                team={team}
                isLocked={!isCaptain}
                onUpdate={loadData}
              />
            </TabsContent>
          </Tabs>
        ) : isPitching ? (
          <Tabs defaultValue="pitch" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pitch">{t('currentPitch')}</TabsTrigger>
              <TabsTrigger value="notes">{t('myNotes')}</TabsTrigger>
            </TabsList>

            <TabsContent value="pitch">
              <PitchViewer key={currentEvent?.current_team_id || 'no-team'} event={currentEvent} />
            </TabsContent>

            <TabsContent value="notes">
              <NotesManager event={currentEvent} />
            </TabsContent>
          </Tabs>
        ) : canVote ? (
          <PortfolioVoting event={currentEvent} profile={profile} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('eventEnded')}</CardTitle>
              <CardDescription>
                {t('thankYouParticipation')}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
