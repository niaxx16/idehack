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
import { Loader2, Users, Crown, FileText, Upload, LogOut, AlertCircle, Lightbulb, Target, Star, Zap, DollarSign, Save, CheckCircle } from 'lucide-react'

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

  const [isLoading, setIsLoading] = useState(true)
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isCaptain, setIsCaptain] = useState(false)

  // Canvas form state
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [valueProposition, setValueProposition] = useState('')
  const [keyFeatures, setKeyFeatures] = useState('')
  const [revenueModel, setRevenueModel] = useState('')
  const [isSavingCanvas, setIsSavingCanvas] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

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
          console.log('Event updated:', payload)
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
        (payload) => {
          console.log('Feedback updated:', payload)
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

      // Set canvas data
      if (teamData.canvas_data) {
        setProblem(teamData.canvas_data.problem || '')
        setSolution(teamData.canvas_data.solution || '')
        setTargetAudience(teamData.canvas_data.target_audience || '')
        setValueProposition(teamData.canvas_data.value_proposition || '')
        setKeyFeatures(teamData.canvas_data.key_features || '')
        setRevenueModel(teamData.canvas_data.revenue_model || '')
      }

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

  const handleSaveCanvas = async (showAlert = true) => {
    if (!team) return

    setIsSavingCanvas(true)
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          canvas_data: {
            problem,
            solution,
            target_audience: targetAudience,
            value_proposition: valueProposition,
            key_features: keyFeatures,
            revenue_model: revenueModel,
          },
        })
        .eq('id', team.id)

      if (error) throw error

      setLastSaved(new Date())
      if (showAlert) {
        alert('Canvas saved successfully!')
      }
    } catch (error) {
      console.error('Save canvas error:', error)
      if (showAlert) {
        alert('Failed to save canvas. Please try again.')
      }
    } finally {
      setIsSavingCanvas(false)
    }
  }

  // Auto-save effect
  useEffect(() => {
    if (!team || !isIdeation) return

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    // Set new timer for auto-save after 3 seconds of inactivity
    const timer = setTimeout(() => {
      handleSaveCanvas(false)
    }, 3000)

    setAutoSaveTimer(timer)

    // Cleanup
    return () => {
      if (timer) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, solution, targetAudience, valueProposition, keyFeatures, revenueModel])

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
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {team.name}
            </h1>
            <p className="text-muted-foreground">Table {team.table_number}</p>
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
                {/* Header with save indicator */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-purple-900">Lean Canvas</h3>
                        <p className="text-sm text-purple-700">Develop your winning idea together</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSavingCanvas ? (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Saving...</span>
                          </div>
                        ) : lastSaved ? (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Saved {lastSaved.toLocaleTimeString()}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Canvas Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Problem */}
                  <Card className="border-l-4 border-red-400 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Problem</CardTitle>
                          <CardDescription className="text-xs">What problem are you solving?</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Describe the main problem your target audience faces..."
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        rows={5}
                        className="resize-none"
                        maxLength={500}
                      />
                      <p className="text-xs text-right text-muted-foreground mt-1">
                        {problem.length}/500
                      </p>
                      <FeedbackDialog
                        sectionKey="problem"
                        sectionTitle="Problem"
                        sectionColor="red"
                        feedbacks={getFeedbackForSection('problem')}
                        onMarkAsRead={markFeedbackAsRead}
                      />
                    </CardContent>
                  </Card>

                  {/* Solution */}
                  <Card className="border-l-4 border-yellow-400 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Lightbulb className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Solution</CardTitle>
                          <CardDescription className="text-xs">How does it work?</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Explain your solution and how it addresses the problem..."
                        value={solution}
                        onChange={(e) => setSolution(e.target.value)}
                        rows={5}
                        className="resize-none"
                        maxLength={500}
                      />
                      <p className="text-xs text-right text-muted-foreground mt-1">
                        {solution.length}/500
                      </p>
                      <FeedbackDialog
                        sectionKey="solution"
                        sectionTitle="Solution"
                        sectionColor="yellow"
                        feedbacks={getFeedbackForSection('solution')}
                        onMarkAsRead={markFeedbackAsRead}
                      />
                    </CardContent>
                  </Card>

                  {/* Unique Value Proposition */}
                  <Card className="border-l-4 border-purple-400 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Star className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Unique Value</CardTitle>
                          <CardDescription className="text-xs">Why choose you?</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="What makes your solution unique and better than alternatives?"
                        value={valueProposition}
                        onChange={(e) => setValueProposition(e.target.value)}
                        rows={5}
                        className="resize-none"
                        maxLength={500}
                      />
                      <p className="text-xs text-right text-muted-foreground mt-1">
                        {valueProposition.length}/500
                      </p>
                      <FeedbackDialog
                        sectionKey="value_proposition"
                        sectionTitle="Unique Value"
                        sectionColor="purple"
                        feedbacks={getFeedbackForSection('value_proposition')}
                        onMarkAsRead={markFeedbackAsRead}
                      />
                    </CardContent>
                  </Card>

                  {/* Target Customers */}
                  <Card className="border-l-4 border-blue-400 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Target Customers</CardTitle>
                          <CardDescription className="text-xs">Who are they?</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Describe your ideal customers, their demographics, and behaviors..."
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        rows={5}
                        className="resize-none"
                        maxLength={500}
                      />
                      <p className="text-xs text-right text-muted-foreground mt-1">
                        {targetAudience.length}/500
                      </p>
                      <FeedbackDialog
                        sectionKey="target_audience"
                        sectionTitle="Target Customers"
                        sectionColor="blue"
                        feedbacks={getFeedbackForSection('target_audience')}
                        onMarkAsRead={markFeedbackAsRead}
                      />
                    </CardContent>
                  </Card>

                  {/* Key Features */}
                  <Card className="border-l-4 border-green-400 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Zap className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Key Features</CardTitle>
                          <CardDescription className="text-xs">Top 3 features</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="List your top 3 key features that deliver the most value..."
                        value={keyFeatures}
                        onChange={(e) => setKeyFeatures(e.target.value)}
                        rows={5}
                        className="resize-none"
                        maxLength={500}
                      />
                      <p className="text-xs text-right text-muted-foreground mt-1">
                        {keyFeatures.length}/500
                      </p>
                      <FeedbackDialog
                        sectionKey="key_features"
                        sectionTitle="Key Features"
                        sectionColor="green"
                        feedbacks={getFeedbackForSection('key_features')}
                        onMarkAsRead={markFeedbackAsRead}
                      />
                    </CardContent>
                  </Card>

                  {/* Revenue Model */}
                  <Card className="border-l-4 border-emerald-400 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Revenue Model</CardTitle>
                          <CardDescription className="text-xs">How to monetize?</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Explain how you will make money from your solution..."
                        value={revenueModel}
                        onChange={(e) => setRevenueModel(e.target.value)}
                        rows={5}
                        className="resize-none"
                        maxLength={500}
                      />
                      <p className="text-xs text-right text-muted-foreground mt-1">
                        {revenueModel.length}/500
                      </p>
                      <FeedbackDialog
                        sectionKey="revenue_model"
                        sectionTitle="Revenue Model"
                        sectionColor="emerald"
                        feedbacks={getFeedbackForSection('revenue_model')}
                        onMarkAsRead={markFeedbackAsRead}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Manual Save Button */}
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <Save className="h-4 w-4" />
                        <span>Auto-save enabled • Changes save automatically</span>
                      </div>
                      <Button
                        onClick={() => handleSaveCanvas(true)}
                        disabled={isSavingCanvas}
                        variant="outline"
                        className="border-green-600 text-green-700 hover:bg-green-50"
                      >
                        {isSavingCanvas ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Now
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
              <Card>
                <CardHeader>
                  <CardTitle>Presentation Upload</CardTitle>
                  <CardDescription>
                    {isCaptain ? 'Upload your team presentation (PDF, PPT, PPTX)' : 'Only the team captain can upload the presentation'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {team.presentation_url ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <FileText className="h-5 w-5" />
                        <span className="font-semibold">Presentation uploaded!</span>
                      </div>
                      {presentationSignedUrl ? (
                        <a
                          href={presentationSignedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View presentation
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">Loading preview...</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No presentation uploaded yet</p>
                    </div>
                  )}

                  {isCaptain && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="presentation">Upload New Presentation</Label>
                        <Input
                          id="presentation"
                          type="file"
                          accept=".pdf,.ppt,.pptx"
                          onChange={(e) => setPresentationFile(e.target.files?.[0] || null)}
                        />
                      </div>

                      <Button
                        onClick={handlePresentationUpload}
                        disabled={!presentationFile || isUploadingPresentation}
                        size="lg"
                        className="w-full"
                      >
                        {isUploadingPresentation ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Presentation
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
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
