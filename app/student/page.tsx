'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { Event, Team, Profile } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PitchViewer } from '@/components/student/pitch-viewer'
import { NotesManager } from '@/components/student/notes-manager'
import { PortfolioVoting } from '@/components/student/portfolio-voting'
import { Loader2, Users, Crown, FileText, Upload, LogOut } from 'lucide-react'

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
  const [revenueModel, setRevenueModel] = useState('')
  const [isSavingCanvas, setIsSavingCanvas] = useState(false)

  // Presentation upload state
  const [presentationFile, setPresentationFile] = useState<File | null>(null)
  const [isUploadingPresentation, setIsUploadingPresentation] = useState(false)

  useRealtimeEvent(currentEvent?.id || null)

  useEffect(() => {
    loadData()
  }, [])

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
        setRevenueModel(teamData.canvas_data.revenue_model || '')
      }

      // Set members
      setMembers(teamData.team_members || [])

      // Check if current user is captain
      setIsCaptain(teamData.captain_id === user.id)
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCanvas = async () => {
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
            revenue_model: revenueModel,
          },
        })
        .eq('id', team.id)

      if (error) throw error

      alert('Canvas saved successfully!')
    } catch (error) {
      console.error('Save canvas error:', error)
      alert('Failed to save canvas. Please try again.')
    } finally {
      setIsSavingCanvas(false)
    }
  }

  const handlePresentationUpload = async () => {
    if (!presentationFile || !team) return

    setIsUploadingPresentation(true)
    try {
      const fileExt = presentationFile.name.split('.').pop()
      const fileName = `${team.id}-${Date.now()}.${fileExt}`
      const filePath = `presentations/${fileName}`

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('team-presentations')
        .upload(filePath, presentationFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('team-presentations')
        .getPublicUrl(filePath)

      // Update team
      const { error: updateError } = await supabase
        .from('teams')
        .update({ presentation_url: publicUrl })
        .eq('id', team.id)

      if (updateError) throw updateError

      setTeam({ ...team, presentation_url: publicUrl })
      setPresentationFile(null)
      alert('Presentation uploaded successfully!')
    } catch (error) {
      console.error('Upload presentation error:', error)
      alert('Failed to upload presentation. Please try again.')
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
              <Card>
                <CardHeader>
                  <CardTitle>Business Model Canvas</CardTitle>
                  <CardDescription>
                    Work together to define your project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="problem">Problem</Label>
                    <Textarea
                      id="problem"
                      placeholder="What problem are you solving?"
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="solution">Solution</Label>
                    <Textarea
                      id="solution"
                      placeholder="How does your solution work?"
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Textarea
                      id="targetAudience"
                      placeholder="Who are your customers?"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="revenueModel">Revenue Model</Label>
                    <Textarea
                      id="revenueModel"
                      placeholder="How will you make money?"
                      value={revenueModel}
                      onChange={(e) => setRevenueModel(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleSaveCanvas} disabled={isSavingCanvas} size="lg" className="w-full">
                    {isSavingCanvas ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Canvas'
                    )}
                  </Button>
                </CardContent>
              </Card>
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
                      <a
                        href={team.presentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View presentation
                      </a>
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
