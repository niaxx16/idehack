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
import { Loader2, Users, Crown, FileText, Upload, LogOut, AlertCircle, Lightbulb, Target, Star, Zap, DollarSign, Save, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-provider'
import { Locale } from '@/lib/i18n/config'

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
            setCurrentEvent(payload.new as Event)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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

      // Load current event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (eventData) {
        setCurrentEvent(eventData)
      }

      // Get team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profileData.team_id)
        .single()

      if (teamError) throw teamError
      setTeam(teamData)

      // Set current user ID
      setCurrentUserId(user.id)

      // Set members
      setMembers(teamData.team_members || [])

      // Check if current user is captain
      setIsCaptain(teamData.captain_id === user.id)

      // Generate signed URL for presentation if exists
      if (teamData.presentation_url) {
        const { data: signedUrlData } = await supabase.storage
          .from('team-presentations')
          .createSignedUrl(teamData.presentation_url, 3600) // 1 hour expiry

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
        <p>No team found. Redirecting...</p>
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
            <p className="text-muted-foreground">Table {team.table_number}</p>
            {profile?.personal_code && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 border border-purple-300 rounded-lg">
                <Users className="h-3 w-3 text-purple-600" />
                <span className="text-xs text-purple-900">
                  Your Code: <span className="font-mono font-bold">{profile.personal_code}</span>
                </span>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Phase-based content */}
        {isWaiting ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to {team.name}!</CardTitle>
              <CardDescription>
                Waiting for the event to start...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-purple-600" />
                <p className="text-muted-foreground">
                  The admin will start the ideation phase soon. Get ready to work on your canvas!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isIdeation ? (
          <Tabs defaultValue="canvas" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="canvas">Canvas</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="presentation">Presentation</TabsTrigger>
            </TabsList>

            {/* Canvas Tab */}
            <TabsContent value="canvas">
              <div className="space-y-4">
                {/* Header */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div>
                      <h3 className="text-xl font-bold text-purple-900">Collaborative Lean Canvas</h3>
                      <p className="text-sm text-purple-700">Each team member can add their ideas • All contributions are visible to everyone</p>
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
                      title="Problem"
                      description="What problem are you solving?"
                      placeholder="Describe the main problem your target audience faces..."
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
                      title="Solution"
                      description="How does it work?"
                      placeholder="Explain your solution and how it addresses the problem..."
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
                      title="Unique Value"
                      description="Why choose you?"
                      placeholder="What makes your solution unique and better than alternatives?"
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
                      title="Target Customers"
                      description="Who are they?"
                      placeholder="Describe your ideal customers, their demographics, and behaviors..."
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
                      title="Key Features"
                      description="Top 3 features"
                      placeholder="List your top 3 key features that deliver the most value..."
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

                    {/* Revenue Model */}
                    <CollaborativeCanvasSection
                      teamId={team.id}
                      currentUserId={currentUserId}
                      section="revenue_model"
                      title="Revenue Model"
                      description="How to monetize?"
                      placeholder="Explain how you will make money from your solution..."
                      icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                      colorClasses={{
                        border: 'border-l-4 border-emerald-400',
                        bg: 'bg-emerald-50',
                        iconBg: 'bg-emerald-100',
                        badgeBg: 'bg-emerald-100',
                      }}
                      teamMembers={members}
                      feedbacks={getFeedbackForSection('revenue_model')}
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
                  <CardTitle>Team Members ({members.length})</CardTitle>
                  <CardDescription>
                    Your team composition
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
                                  Captain
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}

                    {members.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No team members yet</p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground text-center">
                        Share your activation code with teammates: <br />
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
              <TabsTrigger value="pitch">Current Pitch</TabsTrigger>
              <TabsTrigger value="notes">My Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="pitch">
              <PitchViewer event={currentEvent} />
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
              <CardTitle>Event Status: {currentEvent?.status}</CardTitle>
              <CardDescription>
                {currentEvent?.status === 'LOCKED' && 'Preparing for pitches...'}
                {currentEvent?.status === 'COMPLETED' && 'Event completed! Check the results.'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
